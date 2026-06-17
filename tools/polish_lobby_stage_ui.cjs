const { UIBuilder } = require("../.agents/skills/msw-ui-system/scripts/msw_ui_builder.cjs");

const C = {
  panel: { r: 0.105, g: 0.066, b: 0.039, a: 0.92 },
  panel2: { r: 0.145, g: 0.083, b: 0.044, a: 0.95 },
  panel3: { r: 0.075, g: 0.048, b: 0.035, a: 0.86 },
  dark: { r: 0.025, g: 0.018, b: 0.014, a: 0.62 },
  brownBtn: { r: 0.19, g: 0.105, b: 0.047, a: 0.98 },
  brownBtnHi: { r: 0.28, g: 0.16, b: 0.072, a: 1 },
  cta: { r: 0.94, g: 0.78, b: 0.34, a: 1 },
  ctaGreen: { r: 0.78, g: 0.94, b: 0.23, a: 1 },
  gold: { r: 1, g: 0.78, b: 0.32, a: 1 },
  cream: { r: 0.98, g: 0.92, b: 0.78, a: 1 },
  muted: { r: 0.78, g: 0.68, b: 0.52, a: 1 },
  white: { r: 1, g: 0.96, b: 0.86, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 0.72 },
  showcase: { r: 0.075, g: 0.047, b: 0.028, a: 0.72 },
  showcase2: { r: 0.13, g: 0.078, b: 0.038, a: 0.78 },
  glass: { r: 0.025, g: 0.02, b: 0.015, a: 0.46 },
  amber: { r: 1, g: 0.68, b: 0.18, a: 1 },
};

const SPR = {
  button: { DataId: "9bb8e4d004fb46bb9c1b528b3c1ebf9f" },
  panel: { DataId: "25e9e89579644202805f535d038a9edb" },
  glow: { DataId: "4fea64a3307cda641809ad8be0d4890b" },
  cta: { DataId: "e4e06f6334ae490b9bf4732b82003c17" },
  node: { DataId: "4e5d2070c69c4c689ca573005b63f61d" },
};

const TC = "MOD.Core.TextComponent";
const SC = "MOD.Core.SpriteGUIRendererComponent";

function p(b, path, pos, size, anchor = "middle-center") {
  b.patch(path, { anchor, pos, rect_size: size });
}

function box(b, path, color = C.panel, img = SPR.panel, type = 1) {
  b.patchComponent(path, SC, {
    ImageRUID: img,
    Type: type,
    Color: color,
    RaycastTarget: false,
  });
}

function buttonSkin(b, path, color = C.brownBtn, img = SPR.button) {
  b.patchComponent(path, SC, {
    ImageRUID: img,
    Type: 1,
    Color: color,
    RaycastTarget: true,
  });
  b.patchComponent(path, "MOD.Core.ButtonComponent", {
    Transition: 1,
    Colors: {
      NormalColor: { r: 1, g: 1, b: 1, a: 1 },
      HighlightedColor: { r: 1.08, g: 1.06, b: 1.02, a: 1 },
      PressedColor: { r: 0.82, g: 0.76, b: 0.68, a: 1 },
      SelectedColor: { r: 1, g: 0.92, b: 0.62, a: 1 },
      DisabledColor: { r: 0.55, g: 0.55, b: 0.55, a: 0.75 },
      ColorMultiplier: 1,
      FadeDuration: 0.08,
    },
  });
}

function text(b, path, size, color = C.white, align = 4, opts = {}) {
  b.patchComponent(path, TC, {
    Font: opts.font ?? 1,
    FontSize: size,
    MaxSize: opts.max ?? size,
    MinSize: opts.min ?? Math.max(18, size - 8),
    BestFit: opts.bestFit ?? true,
    Alignment: align,
    FontColor: color,
    Bold: opts.bold ?? false,
    Overflow: opts.overflow ?? 2,
    DropShadow: opts.shadow ?? true,
    DropShadowColor: opts.shadowColor ?? C.black,
    DropShadowDistance: opts.shadowDistance ?? 1.5,
    DropShadowAngle: 135,
    UseOutLine: opts.outline ?? false,
    OutlineColor: opts.outlineColor ?? { r: 0.1, g: 0.055, b: 0.025, a: 1 },
    OutlineWidth: opts.outlineWidth ?? 0.18,
  });
}

function setEnabled(b, path, enable) {
  b.patch(path, { enable });
}

function removeTextIfPresent(b, path) {
  if (b.hasComponent(path, TC)) b.removeComponent(path, TC);
}

function polishLobby() {
  const b = UIBuilder.read("ui/LobbyGroup.ui");

  p(b, "LogoPlate", [0, -66], [760, 104], "top-center");
  box(b, "LogoPlate", { r: 0.06, g: 0.038, b: 0.024, a: 0.72 }, SPR.glow, 1);
  p(b, "GameLogo", [0, -30], [560, 58], "top-center");
  text(b, "GameLogo", 42, C.gold, 4, { bold: true, max: 44, min: 34, outline: true, outlineWidth: 0.22 });
  p(b, "GameLogoSub", [0, -76], [520, 24], "top-center");
  text(b, "GameLogoSub", 24, C.cream, 4, { font: 0, bold: false, max: 24, min: 20, shadow: false });
  p(b, "LogoPlate/Mark", [30, 0], [74, 82], "middle-left");
  text(b, "LogoPlate/Mark", 56, C.gold, 4, { bold: true, outline: true, max: 58, min: 46 });
  setEnabled(b, "LogoPlate/TopGlow", false);
  p(b, "LogoPlate/TopGlow", [0, -12], [1, 1], "middle-center");

  [
    ["CoinPill", [-250, -116], [172, 54], "top-center"],
    ["DiaPill", [-58, -116], [150, 54], "top-center"],
    ["EnergyPill", [128, -116], [176, 54], "top-center"],
  ].forEach(([path, pos, size, anchor]) => {
    p(b, path, pos, size, anchor);
    box(b, path, C.panel2);
  });
  [
    ["CurCoin", [-318, -116], [38, 38], "top-center"],
    ["CoinTxt", [-235, -116], [100, 32], "top-center"],
    ["CurDia", [-116, -116], [36, 32], "top-center"],
    ["DiaTxt", [-48, -116], [88, 32], "top-center"],
    ["CurEnergy", [62, -116], [34, 38], "top-center"],
    ["EnergyTxt2", [142, -116], [110, 32], "top-center"],
  ].forEach(([path, pos, size, anchor]) => p(b, path, pos, size, anchor));
  ["CoinTxt", "DiaTxt", "EnergyTxt2"].forEach((path) => text(b, path, 24, C.cream, 4, { font: 0, shadow: false, max: 26 }));

  [
    ["IconMail", [470, -58]],
    ["IconMission", [560, -58]],
    ["IconSettings", [650, -58]],
  ].forEach(([path, pos]) => {
    p(b, path, pos, [88, 88], "top-center");
    buttonSkin(b, path, { r: 0.12, g: 0.075, b: 0.044, a: 0.92 });
    text(b, path, 24, C.cream, 4, { font: 1, max: 24, min: 20, shadow: false });
  });

  p(b, "BuildBanner", [-650, 150], [380, 78]);
  box(b, "BuildBanner", C.panel3);
  p(b, "BuildLbl", [-650, 170], [340, 24]);
  p(b, "BuildVal", [-650, 136], [340, 34]);
  text(b, "BuildLbl", 24, C.muted, 4, { shadow: false });
  text(b, "BuildVal", 27, C.gold, 4, { bold: true, max: 29, min: 22 });

  p(b, "CharFrame", [-650, -70], [410, 430]);
  box(b, "CharFrame", C.panel);
  p(b, "CharFrame/ShowcaseAvatar", [0, 42], [280, 330]);
  p(b, "CharPrev", [-872, -52], [88, 112]);
  p(b, "CharNext", [-428, -52], [88, 112]);
  ["CharPrev", "CharNext"].forEach((path) => {
    buttonSkin(b, path, { r: 0.13, g: 0.077, b: 0.045, a: 0.92 });
    text(b, path, 38, C.cream, 4, { max: 42, min: 30, outline: true, outlineWidth: 0.15 });
  });
  p(b, "LevelPlate", [-650, -326], [380, 76]);
  box(b, "LevelPlate", C.panel2);
  p(b, "LevelTxt", [-650, -312], [330, 34]);
  p(b, "LevelSub", [-650, -342], [280, 26]);
  text(b, "LevelTxt", 25, C.cream, 4, { max: 28, min: 22, shadow: false });
  text(b, "LevelSub", 24, C.muted, 4, { font: 0, shadow: false });

  p(b, "RecentCard", [0, 82], [520, 420]);
  box(b, "RecentCard", C.panel);
  p(b, "RecentTitle", [0, 254], [420, 34]);
  p(b, "RecentStage", [0, 210], [420, 42]);
  p(b, "RecentSub", [0, 162], [198, 38]);
  p(b, "RecentSubTxt", [0, 162], [176, 28]);
  p(b, "RecentThumb", [0, 58], [420, 142]);
  p(b, "ThumbTxt", [0, 58], [260, 32]);
  p(b, "RecentWave", [0, -42], [360, 32]);
  text(b, "RecentTitle", 24, C.gold, 4, { bold: true, max: 26, min: 22 });
  text(b, "RecentStage", 31, C.white, 4, { bold: true, max: 34, min: 26, outline: true, outlineWidth: 0.15 });
  text(b, "RecentSubTxt", 24, C.gold, 4, { shadow: false });
  text(b, "ThumbTxt", 24, C.cream, 4, { shadow: false });
  text(b, "RecentWave", 24, C.muted, 4, { font: 0, shadow: false });
  box(b, "RecentSub", { r: 0.34, g: 0.19, b: 0.08, a: 0.94 });
  box(b, "RecentThumb", { r: 0.055, g: 0.045, b: 0.036, a: 0.82 });

  p(b, "GameStart", [0, -244], [520, 118]);
  buttonSkin(b, "GameStart", C.cta, SPR.cta);
  text(b, "GameStart", 46, { r: 0.12, g: 0.07, b: 0.025, a: 1 }, 4, { bold: true, max: 48, min: 36, shadow: true, shadowColor: { r: 1, g: 0.96, b: 0.72, a: 0.55 } });
  p(b, "GameStart/Shine", [0, -16], [440, 18], "top-center");
  box(b, "GameStart/Shine", { r: 1, g: 0.96, b: 0.72, a: 0.35 }, SPR.glow);
  p(b, "BtnContinue", [0, -344], [260, 88]);
  buttonSkin(b, "BtnContinue", { r: 0.21, g: 0.12, b: 0.055, a: 0.96 });
  text(b, "BtnContinue", 24, C.cream, 4, { max: 26, min: 20, shadow: false });
  p(b, "StartCap", [0, -402], [520, 32]);
  text(b, "StartCap", 24, C.muted, 4, { font: 0, shadow: false });

  p(b, "MissionPanel", [650, 205], [430, 190]);
  p(b, "RecordPanel", [650, 0], [430, 160]);
  p(b, "EventBanner", [650, -166], [430, 88]);
  ["MissionPanel", "RecordPanel", "EventBanner"].forEach((path) => box(b, path, C.panel));
  p(b, "MissionTitle", [650, 274], [330, 30]);
  p(b, "MissionDesc", [650, 232], [350, 30]);
  p(b, "MissionBarBg", [650, 188], [340, 24]);
  p(b, "MissionBarFill", [548, 188], [136, 20]);
  p(b, "MissionProg", [650, 188], [180, 24]);
  p(b, "MissionReward", [650, 148], [260, 28]);
  text(b, "MissionTitle", 24, C.gold, 4, { bold: true, max: 26, min: 22 });
  text(b, "MissionDesc", 24, C.white, 4, { max: 26, min: 22 });
  text(b, "MissionProg", 24, C.cream, 4, { font: 0, shadow: false });
  text(b, "MissionReward", 24, C.muted, 4, { font: 0, shadow: false });
  box(b, "MissionBarBg", { r: 0.04, g: 0.035, b: 0.026, a: 0.9 });
  box(b, "MissionBarFill", { r: 0.84, g: 0.57, b: 0.2, a: 1 });
  p(b, "RecordTitle", [650, 52], [330, 30]);
  p(b, "RecordStage", [650, 14], [350, 28]);
  p(b, "RecordWave", [650, -24], [330, 26]);
  p(b, "RecordTime", [650, -56], [330, 26]);
  text(b, "RecordTitle", 24, C.gold, 4, { bold: true, max: 26, min: 22 });
  ["RecordStage", "RecordWave", "RecordTime"].forEach((path) => text(b, path, 24, C.cream, 4, { font: 0, shadow: false, max: 24, min: 20 }));
  p(b, "EventTitle", [620, -150], [290, 28]);
  p(b, "EventDesc", [620, -184], [290, 26]);
  p(b, "EventGift", [830, -170], [42, 42]);
  text(b, "EventTitle", 24, C.gold, 4, { bold: true, max: 26, min: 22 });
  text(b, "EventDesc", 24, C.cream, 4, { font: 0, shadow: false });

  p(b, "MenuBar", [0, 58], [1800, 112], "bottom-center");
  box(b, "MenuBar", { r: 0.055, g: 0.034, b: 0.022, a: 0.9 });
  const nav = [
    ["BtnStory", "BtnStoryIco", "BtnStoryLbl", -690],
    ["BtnChallenge", "BtnChallengeIco", "BtnChallengeLbl", -345],
    ["BtnTimeAttack", "BtnTimeAttackIco", "BtnTimeAttackLbl", 0],
    ["BtnDex", "BtnDexIco", "BtnDexLbl", 345],
    ["BtnShop", "BtnShopIco", "BtnShopLbl", 690],
  ];
  nav.forEach(([btn, ico, lbl, x]) => {
    p(b, btn, [x, 58], [288, 92], "bottom-center");
    buttonSkin(b, btn, { r: 0.12, g: 0.074, b: 0.044, a: 0.98 });
    p(b, ico, [x - 86, 58], [50, 50], "bottom-center");
    p(b, lbl, [x + 34, 58], [180, 38], "bottom-center");
    text(b, lbl, 27, C.cream, 4, { bold: true, max: 29, min: 22 });
  });
  p(b, "BtnChallenge/CoinInfoText", [0, 58], [1, 1], "bottom-center");
  setEnabled(b, "BtnChallenge/CoinInfoText", false);
  text(b, "BtnChallenge/CoinInfoText", 24, C.muted, 4, { font: 0, shadow: false, max: 24, min: 20 });

  setEnabled(b, "GlowOrb", false);
  setEnabled(b, "SparkleField", false);
  setEnabled(b, "Scenery", false);
  p(b, "GlowOrb", [0, 0], [1, 1]);
  p(b, "SparkleField", [0, 0], [1, 1]);
  p(b, "Scenery", [0, 0], [1, 1]);
  p(b, "Foliage", [0, 0], [1920, 500], "bottom-center");

  b.write("ui/LobbyGroup.ui", { lint: true, strict: false });
}

function polishStageSelect() {
  const b = UIBuilder.read("ui/StageSelectGroup.ui");

  setEnabled(b, "GlowOrb", false);
  setEnabled(b, "SparkleField", false);
  p(b, "GlowOrb", [0, 0], [1, 1]);
  p(b, "SparkleField", [0, 0], [1, 1]);
  setEnabled(b, "DreamVeil", true);
  p(b, "DreamVeil", [0, 0], [1920, 1080]);
  box(b, "DreamVeil", { r: 0.03, g: 0.022, b: 0.018, a: 0.28 }, SPR.glow, 0);

  p(b, "TitleText", [0, -36], [700, 60], "top-center");
  text(b, "TitleText", 44, C.gold, 4, { bold: true, max: 46, min: 36, outline: true, outlineWidth: 0.2 });
  p(b, "ModeBadge", [0, -98], [260, 52], "top-center");
  box(b, "ModeBadge", { r: 0.49, g: 0.31, b: 0.11, a: 0.96 });
  p(b, "ModeBadge/ModeBadgeText", [0, 0], [240, 40], "middle-center");
  text(b, "ModeBadge/ModeBadgeText", 24, C.cream, 4, { bold: true, max: 26, min: 20 });

  p(b, "BtnBack", [60, -190], [178, 88], "top-left");
  buttonSkin(b, "BtnBack", { r: 0.14, g: 0.083, b: 0.047, a: 0.95 });
  text(b, "BtnBack", 25, C.cream, 4, { max: 27, min: 21, shadow: false });

  p(b, "ChapterBanner", [58, -30], [430, 590], "middle-left");
  box(b, "ChapterBanner", C.panel);
  p(b, "ChapterBanner/BannerLabel", [0, -26], [360, 46], "top-center");
  p(b, "ChapterBanner/InfoName", [0, -96], [360, 56], "top-center");
  p(b, "ChapterBanner/InfoStageId", [0, -156], [330, 34], "top-center");
  p(b, "ChapterBanner/InfoDifficulty", [0, -206], [340, 34], "top-center");
  p(b, "ChapterBanner/InfoCompTitle", [0, -276], [340, 30], "top-center");
  p(b, "ChapterBanner/InfoComp", [0, -328], [340, 108], "top-center");
  p(b, "ChapterBanner/InfoBoss", [0, 36], [340, 40], "bottom-center");
  text(b, "ChapterBanner/BannerLabel", 34, C.gold, 4, { bold: true, max: 36, min: 28 });
  text(b, "ChapterBanner/InfoName", 34, C.white, 4, { bold: true, max: 36, min: 28, outline: true, outlineWidth: 0.15 });
  text(b, "ChapterBanner/InfoStageId", 24, C.gold, 4, { max: 26, min: 20, shadow: false });
  text(b, "ChapterBanner/InfoDifficulty", 24, C.cream, 4, { font: 0, max: 24, min: 20, shadow: false });
  text(b, "ChapterBanner/InfoCompTitle", 24, C.gold, 4, { bold: true, max: 24, min: 20 });
  text(b, "ChapterBanner/InfoComp", 24, C.cream, 4, { font: 0, max: 24, min: 20, shadow: false });
  text(b, "ChapterBanner/InfoBoss", 24, C.gold, 4, { font: 0, max: 24, min: 20, shadow: false });

  p(b, "NodesPanel", [230, 160], [1020, 450]);
  const nodes = [
    ["Node_1-1", -340, 100],
    ["Node_1-2", 0, 100],
    ["Node_1-3", 340, 100],
    ["Node_1-6", -340, -110],
    ["Node_1-5", 0, -110],
    ["Node_1-4", 340, -110],
  ];
  nodes.forEach(([name, x, y], i) => {
    const base = `NodesPanel/${name}`;
    p(b, base, [x, y], [230, 150]);
    buttonSkin(b, base, i === 0 ? { r: 0.44, g: 0.31, b: 0.14, a: 1 } : { r: 0.18, g: 0.12, b: 0.07, a: 0.96 }, SPR.node);
    p(b, `${base}/LabelText`, [0, -18], [190, 28], "top-center");
    p(b, `${base}/NameText`, [0, 4], [198, 54], "middle-center");
    p(b, `${base}/BestText`, [0, 12], [190, 26], "bottom-center");
    p(b, `${base}/LockIcon`, [0, 20], [48, 54]);
    p(b, `${base}/ClearMark`, [-12, -12], [40, 40], "top-right");
    text(b, `${base}/LabelText`, 24, C.gold, 4, { font: 0, max: 24, min: 20, shadow: false });
    text(b, `${base}/NameText`, 25, C.white, 4, { bold: true, max: 27, min: 20, outline: true, outlineWidth: 0.12 });
    text(b, `${base}/BestText`, 24, C.muted, 4, { font: 0, max: 24, min: 20, shadow: false });
  });

  p(b, "JobPanel", [230, -238], [1080, 254]);
  box(b, "JobPanel", C.panel);
  p(b, "JobPanel/JobLabel", [26, -22], [170, 28], "top-left");
  p(b, "JobPanel/SkillLabel", [26, -152], [260, 28], "top-left");
  text(b, "JobPanel/JobLabel", 24, C.gold, 3, { bold: true, max: 24, min: 20 });
  text(b, "JobPanel/SkillLabel", 24, C.gold, 3, { font: 0, max: 24, min: 20, shadow: false });
  const jobs = [
    ["Job_warrior", -390],
    ["Job_archer", -130],
    ["Job_mage", 130],
    ["Job_thief", 390],
  ];
  jobs.forEach(([name, x]) => {
    const base = `JobPanel/${name}`;
    removeTextIfPresent(b, base);
    p(b, base, [x, 38], [188, 112]);
    buttonSkin(b, base, { r: 0.19, g: 0.13, b: 0.075, a: 0.96 }, { DataId: "89e93d0c2c8049138f3c217ce7c648cb" });
    p(b, `${base}/IconSprite`, [0, 24], [50, 50]);
    p(b, `${base}/JobNameText`, [0, 12], [160, 30], "bottom-center");
    text(b, `${base}/JobNameText`, 24, C.cream, 4, { bold: true, max: 24, min: 20 });
  });
  p(b, "JobPanel/SkillBtnA", [-170, -88], [330, 88]);
  p(b, "JobPanel/SkillBtnB", [200, -88], [330, 88]);
  ["JobPanel/SkillBtnA", "JobPanel/SkillBtnB"].forEach((path) => {
    buttonSkin(b, path, { r: 0.20, g: 0.11, b: 0.052, a: 0.96 });
    text(b, path, 24, C.cream, 4, { max: 24, min: 20, shadow: false });
  });

  p(b, "BtnAdventure", [-64, 48], [330, 104], "bottom-right");
  buttonSkin(b, "BtnAdventure", C.ctaGreen, SPR.cta);
  text(b, "BtnAdventure", 38, { r: 0.1, g: 0.08, b: 0.025, a: 1 }, 4, { bold: true, max: 40, min: 30, shadow: true, shadowColor: { r: 1, g: 1, b: 0.72, a: 0.45 } });
  p(b, "NoticeText", [60, 48], [760, 42], "bottom-left");
  text(b, "NoticeText", 24, C.cream, 3, { font: 0, max: 24, min: 20, shadow: false });

  b.write("ui/StageSelectGroup.ui", { lint: true, strict: false });
}

function polishMetaHud() {
  const b = UIBuilder.read("ui/MetaHudGroup.ui");

  p(b, "Root", [-34, -206], [118, 58], "top-right");
  p(b, "Root/Bg", [0, 0], [118, 58], "middle-center");
  box(b, "Root/Bg", { r: 0.065, g: 0.04, b: 0.03, a: 0.88 });

  p(b, "Root/EnergyRow", [0, -14], [214, 40], "top-center");
  p(b, "Root/EnergyRow/EIcon", [12, -10], [24, 24], "top-left");
  for (let i = 1; i <= 5; i += 1) {
    p(b, `Root/EnergyRow/Cell${i}`, [-52 + (i - 1) * 28, -11], [24, 20], "top-center");
    box(b, `Root/EnergyRow/Cell${i}`, { r: 0.22, g: 0.72, b: 0.26, a: 1 }, { DataId: "89e93d0c2c8049138f3c217ce7c648cb" });
  }
  p(b, "Root/EnergyRow/RefillText", [76, -9], [92, 26], "top-center");
  text(b, "Root/EnergyRow/RefillText", 20, C.muted, 4, { font: 0, max: 20, min: 16, shadow: false });

  p(b, "Root/MesoRow", [-56, -58], [104, 34], "top-center");
  p(b, "Root/RedMesoRow", [58, -58], [104, 34], "top-center");
  p(b, "Root/LootRow", [0, -96], [1, 1], "top-center");
  p(b, "Root/RerollText", [0, -132], [1, 1], "top-center");
  setEnabled(b, "Root/EnergyRow", false);
  setEnabled(b, "Root/MesoRow", false);
  setEnabled(b, "Root/RedMesoRow", false);
  setEnabled(b, "Root/LootRow", false);
  setEnabled(b, "Root/RerollText", false);
  [
    "Root/EnergyRow",
    "Root/EnergyRow/EIcon",
    "Root/EnergyRow/RefillText",
    "Root/MesoRow",
    "Root/MesoRow/Icon",
    "Root/MesoRow/MesoText",
    "Root/RedMesoRow",
    "Root/RedMesoRow/Icon",
    "Root/RedMesoRow/RedMesoText",
    "Root/LootRow",
    "Root/LootRow/Icon",
    "Root/LootRow/LootText",
    "Root/RerollText",
  ].forEach((path) => p(b, path, [0, 0], [1, 1], "middle-center"));
  for (let i = 1; i <= 5; i += 1) {
    p(b, `Root/EnergyRow/Cell${i}`, [0, 0], [1, 1], "middle-center");
  }
  [
    ["Root/MesoRow/Icon", [8, 0], [24, 24], "middle-left"],
    ["Root/RedMesoRow/Icon", [8, 0], [24, 24], "middle-left"],
    ["Root/LootRow/Icon", [8, 0], [24, 24], "middle-left"],
  ].forEach(([path, pos, size, anchor]) => p(b, path, pos, size, anchor));
  [
    ["Root/MesoRow/MesoText", [40, 0], [58, 30], "middle-left"],
    ["Root/RedMesoRow/RedMesoText", [40, 0], [58, 30], "middle-left"],
    ["Root/LootRow/LootText", [42, 0], [1, 1], "middle-left"],
    ["Root/RerollText", [0, -132], [1, 1], "top-center"],
  ].forEach(([path, pos, size, anchor]) => {
    p(b, path, pos, size, anchor);
    text(b, path, 24, C.cream, path.endsWith("RerollText") ? 4 : 3, { font: 0, max: 24, min: 20, shadow: false });
  });
  [
    "Root/EnergyRow",
    "Root/EnergyRow/EIcon",
    "Root/EnergyRow/RefillText",
    "Root/MesoRow",
    "Root/MesoRow/Icon",
    "Root/MesoRow/MesoText",
    "Root/RedMesoRow",
    "Root/RedMesoRow/Icon",
    "Root/RedMesoRow/RedMesoText",
    "Root/LootRow",
    "Root/LootRow/Icon",
    "Root/LootRow/LootText",
    "Root/RerollText",
  ].forEach((path) => p(b, path, [0, 0], [1, 1], "middle-center"));
  for (let i = 1; i <= 5; i += 1) {
    p(b, `Root/EnergyRow/Cell${i}`, [0, 0], [1, 1], "middle-center");
  }

  p(b, "Root/BtnGrowth", [0, 0], [118, 58], "middle-center");
  buttonSkin(b, "Root/BtnGrowth", { r: 0.20, g: 0.105, b: 0.052, a: 0.96 });
  text(b, "Root/BtnGrowth", 21, C.cream, 4, { bold: true, max: 22, min: 17, shadow: false });

  b.write("ui/MetaHudGroup.ui", { lint: true, strict: false });
}

function presentationLobby() {
  const b = UIBuilder.read("ui/LobbyGroup.ui");

  setEnabled(b, "DreamVeil", true);
  p(b, "DreamVeil", [0, 0], [1920, 1080]);
  box(b, "DreamVeil", { r: 0.025, g: 0.018, b: 0.012, a: 0.16 }, SPR.glow, 0);

  p(b, "LogoPlate", [0, -68], [620, 118], "top-center");
  box(b, "LogoPlate", { r: 0.032, g: 0.024, b: 0.018, a: 0.58 }, SPR.glow, 1);
  p(b, "GameLogo", [0, -42], [560, 64], "top-center");
  text(b, "GameLogo", 54, C.gold, 4, { bold: true, max: 58, min: 42, outline: true, outlineWidth: 0.25 });
  p(b, "GameLogoSub", [0, -90], [500, 26], "top-center");
  text(b, "GameLogoSub", 24, C.cream, 4, { font: 0, max: 24, min: 19, shadow: false });
  p(b, "LogoPlate/Mark", [28, 0], [70, 86], "middle-left");
  text(b, "LogoPlate/Mark", 58, C.amber, 4, { bold: true, outline: true, outlineWidth: 0.18 });

  [
    ["CoinPill", [-238, -146], [156, 46]],
    ["DiaPill", [-54, -146], [132, 46]],
    ["EnergyPill", [126, -146], [160, 46]],
  ].forEach(([path, pos, size]) => {
    p(b, path, pos, size, "top-center");
    box(b, path, C.glass);
  });
  [
    ["CurCoin", [-298, -146], [32, 32]],
    ["CoinTxt", [-224, -146], [88, 30]],
    ["CurDia", [-106, -146], [30, 30]],
    ["DiaTxt", [-46, -146], [72, 30]],
    ["CurEnergy", [66, -146], [30, 32]],
    ["EnergyTxt2", [138, -146], [96, 30]],
  ].forEach(([path, pos, size]) => p(b, path, pos, size, "top-center"));
  ["CoinTxt", "DiaTxt", "EnergyTxt2"].forEach((path) => text(b, path, 22, C.cream, 4, { font: 0, max: 23, min: 18, shadow: false }));

  p(b, "BuildBanner", [-630, 205], [380, 70]);
  box(b, "BuildBanner", C.glass);
  p(b, "BuildLbl", [-630, 220], [330, 22]);
  p(b, "BuildVal", [-630, 190], [330, 32]);
  text(b, "BuildLbl", 22, C.muted, 4, { font: 0, shadow: false });
  text(b, "BuildVal", 28, C.gold, 4, { bold: true, max: 30, min: 22 });

  p(b, "CharFrame", [-630, -66], [470, 500]);
  box(b, "CharFrame", C.showcase);
  p(b, "CharFrame/ShowcaseAvatar", [0, 55], [330, 370]);
  p(b, "CharPrev", [-884, -42], [88, 118]);
  p(b, "CharNext", [-376, -42], [88, 118]);
  p(b, "LevelPlate", [-630, -372], [408, 72]);
  box(b, "LevelPlate", C.glass);
  p(b, "LevelTxt", [-630, -358], [350, 32]);
  p(b, "LevelSub", [-630, -386], [300, 24]);

  p(b, "RecentCard", [0, 76], [560, 350]);
  box(b, "RecentCard", C.showcase);
  p(b, "RecentTitle", [0, 220], [420, 32]);
  p(b, "RecentStage", [0, 178], [440, 46]);
  p(b, "RecentSub", [0, 126], [212, 38]);
  p(b, "RecentSubTxt", [0, 126], [180, 28]);
  p(b, "RecentThumb", [0, 38], [450, 112]);
  p(b, "ThumbTxt", [0, 38], [300, 30]);
  p(b, "RecentWave", [0, -48], [400, 30]);
  box(b, "RecentSub", { r: 0.42, g: 0.24, b: 0.09, a: 0.96 });
  box(b, "RecentThumb", { r: 0.03, g: 0.025, b: 0.018, a: 0.74 });

  p(b, "GameStart", [0, -250], [560, 124]);
  buttonSkin(b, "GameStart", C.cta, SPR.cta);
  text(b, "GameStart", 48, { r: 0.1, g: 0.058, b: 0.02, a: 1 }, 4, { bold: true, max: 50, min: 38, shadow: true, shadowColor: { r: 1, g: 0.96, b: 0.66, a: 0.5 } });
  p(b, "GameStart/Shine", [0, -18], [480, 20], "top-center");
  p(b, "BtnContinue", [0, -372], [268, 88]);
  setEnabled(b, "StartCap", false);
  p(b, "StartCap", [0, 0], [1, 1]);

  p(b, "MissionPanel", [650, 210], [400, 176]);
  p(b, "RecordPanel", [650, 24], [400, 136]);
  p(b, "EventBanner", [650, -126], [400, 82]);
  ["MissionPanel", "RecordPanel", "EventBanner"].forEach((path) => box(b, path, C.showcase));
  p(b, "MissionTitle", [650, 270], [320, 28]);
  p(b, "MissionDesc", [650, 232], [330, 28]);
  p(b, "MissionBarBg", [650, 192], [318, 22]);
  p(b, "MissionBarFill", [554, 192], [128, 18]);
  p(b, "MissionProg", [650, 192], [170, 22]);
  p(b, "MissionReward", [650, 154], [250, 26]);
  p(b, "RecordTitle", [650, 72], [320, 28]);
  p(b, "RecordStage", [650, 36], [330, 26]);
  p(b, "RecordWave", [650, 2], [320, 24]);
  p(b, "RecordTime", [650, -28], [320, 24]);
  p(b, "EventTitle", [622, -112], [286, 26]);
  p(b, "EventDesc", [622, -144], [286, 24]);
  p(b, "EventGift", [830, -128], [40, 40]);

  p(b, "MenuBar", [0, 50], [1740, 100], "bottom-center");
  box(b, "MenuBar", { r: 0.035, g: 0.026, b: 0.018, a: 0.86 });
  [
    ["BtnStory", "BtnStoryIco", "BtnStoryLbl", -672],
    ["BtnChallenge", "BtnChallengeIco", "BtnChallengeLbl", -336],
    ["BtnTimeAttack", "BtnTimeAttackIco", "BtnTimeAttackLbl", 0],
    ["BtnDex", "BtnDexIco", "BtnDexLbl", 336],
    ["BtnShop", "BtnShopIco", "BtnShopLbl", 672],
  ].forEach(([btn, ico, lbl, x]) => {
    p(b, btn, [x, 50], [260, 88], "bottom-center");
    buttonSkin(b, btn, { r: 0.105, g: 0.065, b: 0.038, a: 0.95 });
    p(b, ico, [x - 78, 50], [48, 48], "bottom-center");
    p(b, lbl, [x + 30, 50], [156, 36], "bottom-center");
    text(b, lbl, 26, C.cream, 4, { bold: true, max: 27, min: 21 });
  });

  b.write("ui/LobbyGroup.ui", { lint: true, strict: false });
}

function presentationStageSelect() {
  const b = UIBuilder.read("ui/StageSelectGroup.ui");

  p(b, "DreamVeil", [0, 0], [1920, 1080]);
  box(b, "DreamVeil", { r: 0.02, g: 0.017, b: 0.014, a: 0.26 }, SPR.glow, 0);
  p(b, "BtnBack", [48, -104], [142, 62], "top-left");
  buttonSkin(b, "BtnBack", { r: 0.12, g: 0.075, b: 0.045, a: 0.96 });
  text(b, "BtnBack", 23, C.cream, 4, { max: 24, min: 19, shadow: false });

  p(b, "TitleText", [0, -34], [680, 64], "top-center");
  text(b, "TitleText", 46, C.gold, 4, { bold: true, max: 48, min: 36, outline: true, outlineWidth: 0.2 });
  p(b, "ModeBadge", [0, -94], [190, 38], "top-center");
  box(b, "ModeBadge", { r: 0.40, g: 0.235, b: 0.085, a: 0.9 });
  text(b, "ModeBadge/ModeBadgeText", 21, C.cream, 4, { font: 0, max: 22, min: 18, shadow: false });

  p(b, "ChapterBanner", [54, -28], [382, 430], "middle-left");
  box(b, "ChapterBanner", { r: 0.052, g: 0.036, b: 0.026, a: 0.76 });
  p(b, "ChapterBanner/BannerLabel", [0, -24], [304, 32], "top-center");
  p(b, "ChapterBanner/InfoName", [0, -75], [316, 48], "top-center");
  p(b, "ChapterBanner/InfoStageId", [0, -128], [292, 30], "top-center");
  p(b, "ChapterBanner/InfoDifficulty", [0, -176], [292, 30], "top-center");
  p(b, "ChapterBanner/InfoCompTitle", [0, -232], [292, 28], "top-center");
  p(b, "ChapterBanner/InfoComp", [0, -278], [292, 84], "top-center");
  p(b, "ChapterBanner/InfoBoss", [0, 34], [292, 34], "bottom-center");
  text(b, "ChapterBanner/BannerLabel", 25, C.gold, 4, { bold: true, max: 26, min: 20, shadow: false });
  text(b, "ChapterBanner/InfoName", 31, C.white, 4, { bold: true, max: 32, min: 24, outline: true, outlineWidth: 0.12 });
  text(b, "ChapterBanner/InfoStageId", 23, C.gold, 4, { max: 24, min: 18, shadow: false });
  text(b, "ChapterBanner/InfoDifficulty", 21, C.cream, 4, { font: 0, max: 22, min: 17, shadow: false });
  text(b, "ChapterBanner/InfoCompTitle", 21, C.gold, 4, { bold: true, max: 22, min: 17, shadow: false });
  text(b, "ChapterBanner/InfoComp", 22, C.cream, 4, { font: 0, max: 23, min: 17, shadow: false });
  text(b, "ChapterBanner/InfoBoss", 22, C.gold, 4, { font: 0, max: 23, min: 18, shadow: false });

  p(b, "NodesPanel", [260, 128], [1060, 384]);
  [
    ["Node_1-1", -360, 86, { r: 0.55, g: 0.38, b: 0.13, a: 1 }],
    ["Node_1-2", 0, 86, { r: 0.23, g: 0.145, b: 0.075, a: 0.97 }],
    ["Node_1-3", 360, 86, { r: 0.23, g: 0.145, b: 0.075, a: 0.97 }],
    ["Node_1-6", -360, -100, { r: 0.155, g: 0.1, b: 0.06, a: 0.92 }],
    ["Node_1-5", 0, -100, { r: 0.155, g: 0.1, b: 0.06, a: 0.92 }],
    ["Node_1-4", 360, -100, { r: 0.155, g: 0.1, b: 0.06, a: 0.92 }],
  ].forEach(([name, x, y, color], i) => {
    const base = `NodesPanel/${name}`;
    p(b, base, [x, y], [276, 136]);
    buttonSkin(b, base, color, SPR.node);
    p(b, `${base}/LabelText`, [0, -14], [220, 24], "top-center");
    p(b, `${base}/NameText`, [0, 4], [224, 50], "middle-center");
    p(b, `${base}/BestText`, [0, 10], [214, 24], "bottom-center");
    p(b, `${base}/ClearMark`, [-18, -10], [38, 38], "top-right");
    p(b, `${base}/LockIcon`, [18, -12], [30, 30], "top-left");
    text(b, `${base}/LabelText`, 21, C.gold, 4, { font: 0, max: 22, min: 17, shadow: false });
    text(b, `${base}/NameText`, i === 0 ? 28 : 25, C.white, 4, { bold: true, max: 29, min: 20, outline: true, outlineWidth: 0.12 });
    text(b, `${base}/BestText`, 18, C.muted, 4, { font: 0, max: 19, min: 15, shadow: false });
  });

  p(b, "JobPanel", [260, -294], [1060, 214]);
  box(b, "JobPanel", { r: 0.045, g: 0.032, b: 0.024, a: 0.72 });
  p(b, "JobPanel/JobLabel", [28, -18], [166, 26], "top-left");
  p(b, "JobPanel/SkillLabel", [600, -18], [228, 26], "top-left");
  text(b, "JobPanel/JobLabel", 23, C.gold, 3, { bold: true, max: 24, min: 18, shadow: false });
  text(b, "JobPanel/SkillLabel", 23, C.gold, 3, { bold: true, max: 24, min: 18, shadow: false });
  [
    ["Job_warrior", -410],
    ["Job_archer", -268],
    ["Job_mage", -126],
    ["Job_thief", 16],
  ].forEach(([name, x]) => {
    const base = `JobPanel/${name}`;
    p(b, base, [x, 8], [118, 94]);
    buttonSkin(b, base, name === "Job_warrior" ? { r: 0.45, g: 0.27, b: 0.09, a: 1 } : { r: 0.16, g: 0.105, b: 0.062, a: 0.94 }, { DataId: "89e93d0c2c8049138f3c217ce7c648cb" });
    p(b, `${base}/IconSprite`, [0, 22], [42, 42]);
    p(b, `${base}/JobNameText`, [0, 8], [106, 28], "bottom-center");
    text(b, `${base}/JobNameText`, 20, C.cream, 4, { bold: true, max: 21, min: 16, shadow: false });
  });
  p(b, "JobPanel/SkillBtnA", [320, -36], [250, 74]);
  p(b, "JobPanel/SkillBtnB", [600, -36], [250, 74]);
  ["JobPanel/SkillBtnA", "JobPanel/SkillBtnB"].forEach((path) => {
    buttonSkin(b, path, { r: 0.18, g: 0.095, b: 0.044, a: 0.98 });
    text(b, path, 22, C.cream, 4, { bold: true, max: 23, min: 18, shadow: false });
  });

  p(b, "BtnAdventure", [-62, 42], [356, 108], "bottom-right");
  buttonSkin(b, "BtnAdventure", C.ctaGreen, SPR.cta);
  text(b, "BtnAdventure", 40, { r: 0.09, g: 0.07, b: 0.02, a: 1 }, 4, { bold: true, max: 42, min: 32, shadow: true, shadowColor: { r: 1, g: 1, b: 0.72, a: 0.45 } });
  p(b, "NoticeText", [0, 34], [520, 26], "bottom-center");
  text(b, "NoticeText", 20, C.cream, 4, { font: 0, max: 21, min: 16, shadow: false });

  b.write("ui/StageSelectGroup.ui", { lint: true, strict: false });
}

function presentationGameHud() {
  const b = UIBuilder.read("ui/GameHUDGroup.ui");

  p(b, "StatusPlate", [28, -24], [356, 126], "top-left");
  box(b, "StatusPlate", { r: 0.04, g: 0.052, b: 0.07, a: 0.82 });
  p(b, "JobChip", [58, -48], [44, 44], "top-left");
  box(b, "JobChip", { r: 0.46, g: 0.29, b: 0.1, a: 0.96 });
  p(b, "LevelText", [128, -48], [112, 34], "top-left");
  p(b, "JobText", [242, -48], [122, 32], "top-left");
  text(b, "LevelText", 25, C.gold, 4, { bold: true, max: 27, min: 20, shadow: false });
  text(b, "JobText", 22, C.cream, 4, { font: 0, max: 23, min: 18, shadow: false });
  p(b, "ExpBarBG", [194, -92], [284, 18], "top-left");
  box(b, "ExpBarBG", { r: 0.018, g: 0.022, b: 0.028, a: 0.92 });
  p(b, "ExpBarBG/Fill", [0, 0], [100, 100]);
  box(b, "ExpBarBG/Fill", { r: 0.90, g: 0.62, b: 0.18, a: 1 }, { DataId: "3742216346fa4de7aca7878dfb0e9c31" }, 3);
  p(b, "ExpIcon", [52, -91], [24, 24], "top-left");

  p(b, "WaveBannerBG", [0, -24], [300, 54], "top-center");
  box(b, "WaveBannerBG", { r: 0.045, g: 0.035, b: 0.026, a: 0.86 }, SPR.panel);
  p(b, "WaveText", [0, -24], [276, 48], "top-center");
  text(b, "WaveText", 32, C.gold, 4, { bold: true, max: 34, min: 25, outline: true, outlineWidth: 0.14 });
  p(b, "MonsterCountBG", [0, -84], [300, 38], "top-center");
  box(b, "MonsterCountBG", { r: 0.045, g: 0.035, b: 0.026, a: 0.78 });
  p(b, "MonsterIcon", [-124, -84], [24, 24], "top-center");
  p(b, "MonsterCountText", [16, -84], [246, 30], "top-center");
  text(b, "MonsterCountText", 22, C.cream, 4, { font: 0, max: 23, min: 18, shadow: false });
  p(b, "TimerBG", [0, -130], [150, 38], "top-center");
  box(b, "TimerBG", { r: 0.02, g: 0.024, b: 0.03, a: 0.76 });
  p(b, "TimerText", [0, -130], [136, 32], "top-center");
  text(b, "TimerText", 24, C.white, 4, { bold: true, max: 25, min: 19, shadow: false });

  p(b, "ExitButton", [-34, -24], [64, 64], "top-right");
  buttonSkin(b, "ExitButton", { r: 0.12, g: 0.075, b: 0.044, a: 0.92 });
  p(b, "ExitButton/Icon", [0, 0], [34, 34]);

  p(b, "BossBanner", [0, -176], [430, 66], "top-center");
  box(b, "BossBanner", { r: 0.46, g: 0.08, b: 0.045, a: 0.92 }, SPR.glow);
  p(b, "BossBanner/Text", [0, 0], [400, 58]);
  text(b, "BossBanner/Text", 42, C.white, 4, { bold: true, max: 44, min: 32, outline: true, outlineWidth: 0.16 });

  p(b, "ZenButton", [-34, 40], [220, 94], "bottom-right");
  buttonSkin(b, "ZenButton", C.ctaGreen, SPR.cta);
  if (b.find("ZenButton/Icon")) b.remove("ZenButton/Icon");
  p(b, "ZenButton/CooldownOverlay", [0, 0], [220, 94]);
  box(b, "ZenButton/CooldownOverlay", { r: 0, g: 0, b: 0, a: 0.48 }, { DataId: "6dfb3edaaaf74ce5966eed140e0e09c2" }, 3);
  p(b, "ZenLabel", [-34, 142], [220, 30], "bottom-right");
  text(b, "ZenLabel", 21, C.cream, 4, { font: 0, max: 22, min: 17, shadow: false });
  p(b, "RerollButton", [-278, 40], [154, 94], "bottom-right");
  buttonSkin(b, "RerollButton", { r: 0.16, g: 0.10, b: 0.055, a: 0.95 });
  text(b, "RerollButton", 22, C.cream, 4, { bold: true, max: 23, min: 18, shadow: false });

  p(b, "ExitConfirm/Panel", [0, 0], [560, 304]);
  box(b, "ExitConfirm/Panel", { r: 0.055, g: 0.04, b: 0.03, a: 0.96 });
  p(b, "ExitConfirm/Panel/Message", [0, -56], [500, 64]);
  text(b, "ExitConfirm/Panel/Message", 29, C.white, 4, { bold: true, max: 31, min: 23, shadow: false });
  p(b, "ExitConfirm/Panel/BtnYes", [-122, 66], [216, 78]);
  p(b, "ExitConfirm/Panel/BtnNo", [122, 66], [216, 78]);
  buttonSkin(b, "ExitConfirm/Panel/BtnYes", { r: 0.62, g: 0.18, b: 0.10, a: 0.96 });
  buttonSkin(b, "ExitConfirm/Panel/BtnNo", C.ctaGreen, SPR.cta);
  text(b, "ExitConfirm/Panel/BtnYes", 27, C.white, 4, { bold: true, max: 28, min: 22 });
  text(b, "ExitConfirm/Panel/BtnNo", 27, { r: 0.1, g: 0.08, b: 0.025, a: 1 }, 4, { bold: true, max: 28, min: 22, shadow: false });

  b.write("ui/GameHUDGroup.ui", { lint: true, strict: false });
}

function presentationSkillHud() {
  const b = UIBuilder.read("ui/SkillHUDGroup.ui");

  p(b, "Root", [24, -88], [236, 418], "top-left");
  p(b, "Root/Bg", [0, 0], [236, 418]);
  box(b, "Root/Bg", { r: 0.028, g: 0.034, b: 0.043, a: 0.78 });
  p(b, "Root/Title", [0, -20], [212, 30], "top-center");
  text(b, "Root/Title", 22, C.gold, 4, { bold: true, max: 23, min: 18, shadow: false });

  for (let i = 1; i <= 8; i += 1) {
    const col = (i - 1) % 2;
    const row = Math.floor((i - 1) / 2);
    const base = `Root/Slot${i}`;
    p(b, base, [58 + col * 106, -72 - row * 86], [84, 76], "top-left");
    box(b, base, { r: 0.12, g: 0.085, b: 0.052, a: 0.94 }, { DataId: "89e93d0c2c8049138f3c217ce7c648cb" });
    p(b, `${base}/NameText`, [0, -8], [72, 34], "middle-center");
    p(b, `${base}/LevelText`, [0, 8], [66, 18], "bottom-center");
    text(b, `${base}/NameText`, 16, C.cream, 4, { bold: true, max: 17, min: 12, shadow: false });
    text(b, `${base}/LevelText`, 14, C.gold, 5, { font: 0, max: 15, min: 11, shadow: false });
    p(b, `${base}/Badge`, [-4, -4], [38, 18], "top-right");
    p(b, `${base}/Badge/BadgeText`, [0, 0], [36, 18]);
    text(b, `${base}/Badge/BadgeText`, 12, C.white, 4, { bold: true, max: 12, min: 10, shadow: false });
  }

  b.write("ui/SkillHUDGroup.ui", { lint: true, strict: false });
}

function presentationCombatControlHud() {
  const b = UIBuilder.read("ui/CombatControlHUDGroup.ui");

  p(b, "SkillOrderPanel", [0, 58], [570, 82], "bottom-center");
  box(b, "SkillOrderPanel", { r: 0.026, g: 0.032, b: 0.041, a: 0.66 });
  p(b, "SkillOrderPanel/OrderTitleText", [0, 26], [530, 22]);
  text(b, "SkillOrderPanel/OrderTitleText", 14, C.gold, 4, { font: 0, max: 15, min: 12, shadow: false });
  for (let i = 1; i <= 8; i += 1) {
    const x = -245 + (i - 1) * 70;
    const path = `SkillOrderPanel/Slot${i}Btn`;
    p(b, path, [x, -12], [54, 46]);
    buttonSkin(b, path, { r: 0.13, g: 0.09, b: 0.052, a: 0.96 });
    text(b, path, 11, C.cream, 4, { bold: true, max: 12, min: 9, shadow: false });
  }

  p(b, "ControlPanel", [-34, 156], [300, 376], "bottom-right");
  box(b, "ControlPanel", { r: 0.026, g: 0.032, b: 0.041, a: 0.80 });
  p(b, "ControlPanel/Title", [0, -14], [260, 32], "top-center");
  text(b, "ControlPanel/Title", 22, C.gold, 4, { bold: true, max: 23, min: 18, shadow: false });
  p(b, "ControlPanel/ModeCaption", [0, -54], [160, 24], "top-center");
  text(b, "ControlPanel/ModeCaption", 16, C.muted, 4, { font: 0, max: 17, min: 13, shadow: false });
  p(b, "ControlPanel/ModeToggleBtn", [-58, -96], [108, 54], "top-center");
  p(b, "ControlPanel/ModeAutoBtn", [58, -96], [108, 54], "top-center");
  ["ControlPanel/ModeToggleBtn", "ControlPanel/ModeAutoBtn"].forEach((path) => {
    buttonSkin(b, path, { r: 0.14, g: 0.09, b: 0.052, a: 0.96 });
    text(b, path, 20, C.cream, 4, { bold: true, max: 21, min: 16, shadow: false });
  });

  p(b, "ControlPanel/DirUpBtn", [0, -164], [62, 62], "top-center");
  p(b, "ControlPanel/DirLeftBtn", [-70, -232], [62, 62], "top-center");
  p(b, "ControlPanel/DirRightBtn", [70, -232], [62, 62], "top-center");
  p(b, "ControlPanel/DirDownBtn", [0, -300], [62, 62], "top-center");
  ["ControlPanel/DirUpBtn", "ControlPanel/DirLeftBtn", "ControlPanel/DirRightBtn", "ControlPanel/DirDownBtn"].forEach((path) => {
    buttonSkin(b, path, { r: 0.12, g: 0.08, b: 0.046, a: 0.96 });
    text(b, path, 24, C.cream, 4, { bold: true, max: 25, min: 19, shadow: false });
  });
  p(b, "ControlPanel/TargetBtn", [0, 72], [180, 56]);
  buttonSkin(b, "ControlPanel/TargetBtn", { r: 0.18, g: 0.095, b: 0.044, a: 0.96 });
  text(b, "ControlPanel/TargetBtn", 18, C.cream, 4, { bold: true, max: 19, min: 14, shadow: false });
  p(b, "ControlPanel/TargetStateText", [0, 32], [220, 22]);
  text(b, "ControlPanel/TargetStateText", 14, C.muted, 4, { font: 0, max: 15, min: 11, shadow: false });

  b.write("ui/CombatControlHUDGroup.ui", { lint: true, strict: false });
}

function presentationWorldHpBar() {
  const b = UIBuilder.read("ui/WorldHpBarGroup.ui");

  p(b, "BarTemplate", [0, 0], [96, 14]);
  box(b, "BarTemplate", { r: 0.06, g: 0.03, b: 0.03, a: 0.76 }, { DataId: "2160f36fea1c41b5b487e74eb5dcf6d7" });
  p(b, "BarTemplate/Fill", [0, 0], [96, 14]);
  box(b, "BarTemplate/Fill", { r: 0.90, g: 0.18, b: 0.12, a: 1 }, { DataId: "2160f36fea1c41b5b487e74eb5dcf6d7" }, 3);
  p(b, "BossBar", [0, -96], [560, 62], "top-center");
  p(b, "BossBar/Frame", [0, 0], [560, 62]);
  box(b, "BossBar/Frame", { r: 0.045, g: 0.026, b: 0.026, a: 0.92 }, SPR.panel);
  p(b, "BossBar/Name", [0, -5], [520, 28], "top-center");
  text(b, "BossBar/Name", 25, C.white, 4, { bold: true, max: 26, min: 20, shadow: false });
  p(b, "BossBar/Gauge", [0, 14], [520, 20]);
  box(b, "BossBar/Gauge", { r: 0.04, g: 0.016, b: 0.016, a: 0.88 }, { DataId: "2160f36fea1c41b5b487e74eb5dcf6d7" });
  p(b, "BossBar/Gauge/Fill", [0, 0], [520, 20]);
  box(b, "BossBar/Gauge/Fill", { r: 0.90, g: 0.15, b: 0.10, a: 1 }, { DataId: "3742216346fa4de7aca7878dfb0e9c31" }, 3);

  b.write("ui/WorldHpBarGroup.ui", { lint: true, strict: false });
}

function presentationCompanionPanel() {
  const b = UIBuilder.read("ui/CompanionPanelGroup.ui");

  p(b, "Root", [0, 12], [720, 420]);
  p(b, "Root/Bg", [0, 0], [720, 420]);
  box(b, "Root/Bg", { r: 0.026, g: 0.032, b: 0.041, a: 0.78 });
  p(b, "Root/Frame", [0, 0], [720, 420]);
  box(b, "Root/Frame", { r: 0.12, g: 0.085, b: 0.052, a: 0.52 });
  p(b, "Root/Title", [0, -6], [200, 40]);
  text(b, "Root/Title", 26, C.gold, 4, { bold: true, max: 28, min: 20, shadow: false });

  [["Slot1", -185], ["Slot2", 185]].forEach(([slot, x]) => {
    const base = `Root/${slot}`;
    p(b, base, [x, -32], [320, 356]);
    p(b, `${base}/SlotBg`, [0, 0], [320, 356]);
    box(b, `${base}/SlotBg`, { r: 0.10, g: 0.072, b: 0.045, a: 0.86 }, { DataId: "89e93d0c2c8049138f3c217ce7c648cb" });
    p(b, `${base}/TitleText`, [0, -8], [288, 32]);
    text(b, `${base}/TitleText`, 24, C.cream, 4, { bold: true, max: 25, min: 19, shadow: false });
    p(b, `${base}/BtnUp`, [0, 78], [80, 80]);
    p(b, `${base}/BtnDown`, [0, -14], [80, 80]);
    p(b, `${base}/BtnLeft`, [-92, 32], [80, 80]);
    p(b, `${base}/BtnRight`, [92, 32], [80, 80]);
    p(b, `${base}/BtnRotate`, [0, -106], [264, 72]);
    ["BtnUp", "BtnDown", "BtnLeft", "BtnRight", "BtnRotate"].forEach((name) => {
      buttonSkin(b, `${base}/${name}`, { r: 0.13, g: 0.09, b: 0.052, a: 0.96 });
      text(b, `${base}/${name}`, name === "BtnRotate" ? 21 : 30, C.cream, 4, { bold: true, max: name === "BtnRotate" ? 22 : 32, min: name === "BtnRotate" ? 16 : 24, shadow: false });
    });
    p(b, `${base}/OrderText`, [0, 4], [288, 28]);
    text(b, `${base}/OrderText`, 18, C.muted, 4, { font: 0, max: 19, min: 14, shadow: false });
  });

  b.write("ui/CompanionPanelGroup.ui", { lint: true, strict: false });
}

polishLobby();
polishStageSelect();
polishMetaHud();
presentationLobby();
presentationStageSelect();
presentationGameHud();
presentationSkillHud();
presentationCombatControlHud();
presentationWorldHpBar();
presentationCompanionPanel();
