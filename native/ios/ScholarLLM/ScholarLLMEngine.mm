//
//  ScholarLLMEngine.mm
//  ScholarFlow 端侧 MNN 推理引擎（ObjC++）
//
//  改编自 alibaba/MNN 官方 LLMInferenceEngineWrapper.mm 的已验证流程：
//    createLLM(config.json) → set_config(use_mmap) → load()
//    response(history,&os,"<eop>",1) + generate(1) 循环，token 经 std::streambuf 回调流出。
//
//  ⚠️ 需在 Xcode 内编译验证的点（已用 VERIFY 标注）：
//    - MNN 头文件 include 路径（取决于你的 MNN framework 布局，参考官方 app）
//    - 多轮 KV 复用：本实现每轮 reset() 后用整段 history 重新 prefill（与前端"每次发全量历史"一致）
//
#import "ScholarLLMEngine.h"

#include <sstream>
#include <string>
#include <vector>
#include <functional>
#include <atomic>

// MNN.framework 的头文件在 Headers/llm/llm.hpp → 用 framework 模块路径，链上 framework 即可解析。
#include <MNN/llm/llm.hpp>

using MNN::Transformer::Llm;
using ChatMessage  = std::pair<std::string, std::string>;
using ChatMessages = std::vector<ChatMessage>;

// 复用官方 streambuf→回调 思路：每段 flush 即回调一次（token/小块）。
class TokenStreamBuffer : public std::streambuf {
public:
    using CallBack = std::function<void(const std::string &)>;
    explicit TokenStreamBuffer(CallBack cb) : _cb(std::move(cb)) {}
    ~TokenStreamBuffer() override { flush(); }
protected:
    std::streamsize xsputn(const char *s, std::streamsize n) override {
        if (n > 0) { _buf.append(s, static_cast<size_t>(n)); flush(); }
        return n;
    }
private:
    void flush() { if (_cb && !_buf.empty()) { _cb(_buf); _buf.clear(); } }
    CallBack _cb;
    std::string _buf;
};

@implementation ScholarLLMEngine {
    std::shared_ptr<Llm> _llm;
    std::atomic<bool> _stop;
    std::atomic<bool> _busy;
}

- (void)loadModelAtDir:(NSString *)modelDir completion:(ScholarLLMLoadHandler)completion {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^{
        @try {
            std::string dir = [modelDir UTF8String];
            std::string configPath = dir + "/config.json";
            self->_llm.reset(Llm::createLLM(configPath));
            if (!self->_llm) { completion(NO, @"createLLM 失败：检查 config.json 路径"); return; }
            std::string tmp = [NSTemporaryDirectory() UTF8String];
            self->_llm->set_config(std::string("{\"tmp_path\":\"") + tmp + "\",\"use_mmap\":true}");
            self->_llm->load();
            completion(YES, nil);
        } @catch (NSException *e) {
            completion(NO, e.reason ?: @"load 异常");
        }
    });
}

- (BOOL)isReady { return _llm != nullptr; }

- (void)chatWithMessages:(NSArray<NSDictionary<NSString *, NSString *> *> *)messages
                 onToken:(ScholarLLMTokenHandler)onToken
                  onDone:(ScholarLLMDoneHandler)onDone {
    if (!_llm) { onDone(@"", @"模型未加载"); return; }
    if (_busy.exchange(true)) { onDone(@"", @"已有推理在进行中"); return; }

    __weak ScholarLLMEngine *weakSelf = self;
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0), ^{
        ScholarLLMEngine *me = weakSelf;
        if (!me || !me->_llm) { onDone(@"", @"引擎已释放"); return; }
        @try {
            // 组装 ChatMessages（含 system/user/assistant 全量历史，由前端传入）
            ChatMessages prompts;
            for (NSDictionary *m in messages) {
                NSString *role = m[@"role"] ?: @"user";
                NSString *content = m[@"content"] ?: @"";
                prompts.emplace_back(std::string([role UTF8String]), std::string([content UTF8String]));
            }

            std::string full;
            auto cb = [onToken, &full](const std::string &chunk) {
                full += chunk;
                NSString *t = [NSString stringWithUTF8String:chunk.c_str()];
                if (t) dispatch_async(dispatch_get_main_queue(), ^{ onToken(t); });
            };
            TokenStreamBuffer sbuf(cb);
            std::ostream os(&sbuf);

            me->_stop = false;
            me->_llm->reset(); // VERIFY: 每轮清空上轮 KV，再用整段 history 重新 prefill

            // 首 token + 逐 token 生成（与官方一致，便于响应取消）
            me->_llm->response(prompts, &os, "<eop>", 1);
            int n = 1;
            const int kMaxNewTokens = 2048;
            while (!me->_stop.load() && !me->_llm->stoped() && n < kMaxNewTokens) {
                me->_llm->generate(1);
                n++;
            }

            NSString *fullText = [NSString stringWithUTF8String:full.c_str()] ?: @"";
            dispatch_async(dispatch_get_main_queue(), ^{ onDone(fullText, nil); });
        } @catch (NSException *e) {
            dispatch_async(dispatch_get_main_queue(), ^{ onDone(@"", e.reason ?: @"推理异常"); });
        }
        me->_busy = false;
    });
}

- (void)stop { _stop = true; }

@end
