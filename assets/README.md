# 游戏资源目录

此目录用于存放《迷迭香的记忆迷宫》的可替换外部资源。初版不依赖任何尚未提供的图片或音频：图片槽位统一使用 `placeholders/` 中的中性 SVG，占位音频则在资源注册表中保持为 `null`，不会请求失效地址。

## 计划使用的文件

```text
assets/
├─ images/
│  ├─ characters/
│  │  └─ rosmontis-portrait.webp
│  ├─ nodes/
│  │  ├─ combat.webp
│  │  ├─ rest.webp
│  │  ├─ shop.webp
│  │  ├─ wonder.webp
│  │  ├─ unknown.webp
│  │  └─ boss.webp
│  └─ modules/
│     └─ <module-id>.webp
├─ audio/
│  ├─ bgm/
│  │  ├─ maze.ogg
│  │  ├─ combat.ogg
│  │  └─ boss.ogg
│  └─ sfx/
│     └─ node-open.ogg
└─ placeholders/
   ├─ character-blank.svg
   ├─ node-blank.svg
   └─ module-blank.svg
```

资源准备好后，请在 `src/assets/assetRegistry.ts` 中导入并替换对应槽位。推荐图片使用 WebP，音频使用 Ogg；如采用其他格式，只需同步修改注册表，不需要改动业务组件。

