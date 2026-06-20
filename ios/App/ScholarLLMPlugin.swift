//
//  ScholarLLMPlugin.swift
//  ScholarFlow —— Capacitor 插件，把 ScholarLLMEngine(端侧 MNN) 暴露给 JS。
//
//  JS 侧契约见 lib/chat/scholar-llm-plugin.ts：
//    load({modelDir}) / isReady() / chat({id,messages}) / stop({id})
//    事件：'onToken' { id, token }
//
//  注意：ScholarLLMEngine 是 ObjC++，需在 App 的 Bridging Header 里 #import "ScholarLLMEngine.h"
//
import Foundation
import Capacitor

@objc(ScholarLLMPlugin)
public class ScholarLLMPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScholarLLMPlugin"
    public let jsName = "ScholarLLM"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isReady", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "chat",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop",    returnType: CAPPluginReturnPromise),
    ]

    private let engine = ScholarLLMEngine()

    @objc func load(_ call: CAPPluginCall) {
        guard let modelName = call.getString("modelName") else {
            call.reject("modelName is required"); return
        }
        // 解析模型目录，兼容两种打包布局：
        //   1) <modelName>/config.json —— folder reference（蓝色文件夹，推荐）
        //   2) config.json 直接在 app 包根 —— 同步组被摊平时的兜底（当前就是这种）
        // 改为下载到沙盒时，把这段换成 Documents 下的路径解析即可。
        let fm = FileManager.default
        let modelDir: String
        if let dir = Bundle.main.path(forResource: modelName, ofType: nil),
           fm.fileExists(atPath: (dir as NSString).appendingPathComponent("config.json")) {
            modelDir = dir
        } else if let cfg = Bundle.main.path(forResource: "config", ofType: "json") {
            modelDir = (cfg as NSString).deletingLastPathComponent
        } else {
            call.reject("找不到模型 config.json（既不在 \(modelName)/ 子目录，也不在 app 包根目录）"); return
        }
        engine.loadModel(atDir: modelDir) { success, error in
            if success { call.resolve() } else { call.reject(error ?? "load failed") }
        }
    }

    @objc func isReady(_ call: CAPPluginCall) {
        call.resolve(["ready": engine.isReady()])
    }

    @objc func chat(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("id is required"); return }
        let raw = call.getArray("messages") as? [[String: Any]] ?? []
        let messages: [[String: String]] = raw.map { m in
            ["role": (m["role"] as? String) ?? "user",
             "content": (m["content"] as? String) ?? ""]
        }
        // 保活 call 直到 onDone（streaming 期间多次 notifyListeners）
        call.keepAlive = true
        engine.chat(withMessages: messages, onToken: { [weak self] token in
            self?.notifyListeners("onToken", data: ["id": id, "token": token])
        }, onDone: { fullText, error in
            if let error = error { call.reject(error) }
            else { call.resolve(["text": fullText]) }
        })
    }

    @objc func stop(_ call: CAPPluginCall) {
        engine.stop()
        call.resolve()
    }
}
