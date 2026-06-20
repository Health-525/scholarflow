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
        // 约定：模型文件夹随 app bundle 内置，名为 <modelName>（参考官方 LocalModel）。
        // 改为下载到沙盒时，把这段换成 Documents 下的路径解析即可。
        guard let modelDir = Bundle.main.path(forResource: modelName, ofType: nil) else {
            call.reject("找不到内置模型: \(modelName)（请把模型文件夹加入 app bundle）"); return
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
