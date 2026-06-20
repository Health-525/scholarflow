//
//  ScholarLLMEngine.h
//  ScholarFlow 端侧 MNN 推理引擎（ObjC++ 封装）
//
//  改编自 alibaba/MNN 官方 iOS app 的 LLMInferenceEngineWrapper（仅保留文本对话）。
//  对 Swift 暴露：加载模型 / 流式对话 / 取消。
//
#ifndef ScholarLLMEngine_h
#define ScholarLLMEngine_h

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^ScholarLLMLoadHandler)(BOOL success, NSString *_Nullable error);
typedef void (^ScholarLLMTokenHandler)(NSString *token);
typedef void (^ScholarLLMDoneHandler)(NSString *fullText, NSString *_Nullable error);

@interface ScholarLLMEngine : NSObject

/// 从 modelDir/config.json 创建并加载 MNN Llm（后台线程，完成回调 completion）。
- (void)loadModelAtDir:(NSString *)modelDir completion:(ScholarLLMLoadHandler)completion;

/// 模型是否已加载就绪。
- (BOOL)isReady;

/// 用整段会话(每项含 "role"/"content")做一轮流式生成：
/// 每个 token 经 onToken 回传，结束调用 onDone(完整文本, 错误)。
- (void)chatWithMessages:(NSArray<NSDictionary<NSString *, NSString *> *> *)messages
                 onToken:(ScholarLLMTokenHandler)onToken
                  onDone:(ScholarLLMDoneHandler)onDone;

/// 请求取消当前生成（下一 token 边界生效）。
- (void)stop;

@end

NS_ASSUME_NONNULL_END

#endif /* ScholarLLMEngine_h */
