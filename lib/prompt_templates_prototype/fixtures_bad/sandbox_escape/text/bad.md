---
id: text/bad
category: text
title: 坏模版样例
description: 模版试图访问内部属性
applies_to: {content_modes: [drama]}
slots:
  style: 风格
protected: false
---
{{ style.__class__.__mro__ }}
