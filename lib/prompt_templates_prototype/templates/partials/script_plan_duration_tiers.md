{% if default_duration %}
从支持的秒数档位（{{ durations }}）中按画面内容选择：默认 {{ default_duration }} 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 {{ max_duration }} 秒，不要默认选最短档
{% else %}
从支持的秒数档位（{{ durations }}）中按画面内容复杂度匹配合适时长（最长 {{ max_duration }} 秒），不强制默认值
{% endif %}
