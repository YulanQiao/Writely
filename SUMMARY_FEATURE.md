# Summary功能说明

## 新增功能
在用户高亮文本后，现在可以选择"Summary"功能来生成文本总结。

## 功能特点
- **位置**：Summary按钮位于Translate按钮下侧，Rewrite按钮上侧
- **API调用**：使用Gemini API生成总结
- **输出格式**：
  - 简要概述（2-3句话）
  - 关键要点（bullet points）
  - 重要细节和支持信息

## 使用方法
1. 在任意网页上高亮选择文本
2. 点击AI助手图标
3. 选择"Summary"选项
4. 等待AI生成总结
5. 可以复制总结结果或关闭窗口

## 技术实现
- **前端**：在content.js中添加了summary按钮和显示逻辑
- **后端**：在background.js中添加了summary的Gemini API prompt和处理逻辑
- **API**：使用Gemini 2.5 Flash模型生成结构化总结

## 输出示例
```
**Summary:**
This text discusses the importance of artificial intelligence in modern technology and its potential applications in various industries.

**Key Points:**
• AI is becoming increasingly important in technology
• It has applications across multiple industries
• The technology is rapidly evolving
• It offers significant potential for automation
```

## 注意事项
- 需要有效的Gemini API密钥
- 支持免费试用模式
- 总结质量取决于输入文本的长度和复杂度



