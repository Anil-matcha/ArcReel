---
id: text/bad
category: text
title: 坏模版样例
description: 固定片段不存在
applies_to: {content_modes: [drama]}
slots:
  style: 风格
protected: false
---
风格：{{ style }}
{{ partial("nope") }}
