const { UIBuilder } = require("../.agents/skills/msw-ui-system/scripts/msw_ui_builder.cjs");

const S = "MOD.Core.SpriteGUIRendererComponent";
const X = "MOD.Core.TextComponent";
const B = "MOD.Core.ButtonComponent";
const col = (r, g, b, a = 1) => ({ r, g, b, a });

function sp(b, id, updates) {
  b.patchComponent(id, S, updates);
}

function tx(b, id, updates) {
  b.patchComponent(
    id,
    X,
    Object.assign(
      {
        BestFit: true,
        Overflow: 2,
        UseOutLine: false,
        DropShadow: true,
        DropShadowColor: col(0, 0, 0, 0.72),
        DropShadowDistance: 1.25,
      },
      updates,
    ),
  );
}

function btn(b, id) {
  const current = b.getComponent(id, B);
  if (!current) return;
  b.patchComponent(id, B, {
    Transition: 1,
    Colors: Object.assign(current.Colors || {}, {
      NormalColor: col(1, 1, 1, 1),
      HighlightedColor: col(1.08, 1.08, 1.08, 1),
      PressedColor: col(0.82, 0.82, 0.82, 1),
      DisabledColor: col(0.45, 0.45, 0.45, 0.75),
      ColorMultiplier: 1,
      FadeDuration: 0.08,
    }),
  });
}

function ensureText(b, id, text, options) {
  try {
    b.getId(id);
    b.patch(id, options);
    tx(b, id, { Text: text, ...(options.text || {}) });
  } catch (_) {
    b.text(id, text, options);
    tx(b, id, options.text || {});
  }
}

{
  const b = UIBuilder.read("ui/GameHUDGroup.ui");
  b.patch("ZenButton", { anchor: "bottom-right", pos: [-292, 28], rect_size: [178, 76], pivot: [1, 0] });
  b.patch("ZenButton/CooldownOverlay", { rect_size: [178, 76] });
  b.patch("ZenLabel", { anchor: "bottom-right", pos: [-292, 110], rect_size: [178, 22], pivot: [1, 0] });
  b.patch("RerollButton", { anchor: "bottom-right", pos: [-486, 28], rect_size: [164, 76], pivot: [1, 0] });
  sp(b, "ZenButton", { Color: col(0.5, 0.86, 0.05, 0.98), Type: 1, DropShadow: true, DropShadowDistance: 3 });
  sp(b, "RerollButton", { Color: col(0.075, 0.055, 0.04, 0.96), Type: 1, DropShadow: true, DropShadowDistance: 3 });
  tx(b, "ZenLabel", { FontSize: 14, MinSize: 11, MaxSize: 15, Bold: true, FontColor: col(1, 0.96, 0.82, 1), Text: "\uC18C\uD658" });
  tx(b, "RerollButton", { FontSize: 20, MinSize: 15, MaxSize: 21, Bold: true, FontColor: col(1, 0.9, 0.62, 1), Text: "\uB9AC\uB864 3" });
  ensureText(b, "ZenButton/ZenButtonText", "\uC820", {
    anchor: "middle-center",
    pos: [0, 6],
    rect_size: [152, 42],
    pivot: [0.5, 0.5],
    text: { FontSize: 28, MinSize: 20, MaxSize: 30, Bold: true, FontColor: col(0.12, 0.18, 0.03, 1), DropShadow: false },
  });
  ensureText(b, "ZenButton/ZenButtonHint", "WAVE", {
    anchor: "middle-center",
    pos: [0, -24],
    rect_size: [128, 18],
    pivot: [0.5, 0.5],
    text: { FontSize: 12, MinSize: 9, MaxSize: 13, Bold: true, FontColor: col(0.22, 0.3, 0.05, 0.95), DropShadow: false },
  });
  btn(b, "ZenButton");
  btn(b, "RerollButton");
  btn(b, "ExitButton");
  b.write("ui/GameHUDGroup.ui");
}

{
  const b = UIBuilder.read("ui/CombatControlHUDGroup.ui");
  b.patch("ControlPanel", { anchor: "bottom-right", pos: [-24, 178], rect_size: [236, 312], pivot: [1, 0.5] });
  sp(b, "ControlPanel", { Color: col(0.014, 0.017, 0.024, 0.84), Type: 1, DropShadow: true, DropShadowDistance: 4 });
  b.patch("ControlPanel/Title", { pos: [0, -18], rect_size: [218, 26] });
  tx(b, "ControlPanel/Title", { FontSize: 20, MinSize: 16, MaxSize: 21, Bold: true, FontColor: col(1, 0.82, 0.34, 1) });
  b.patch("ControlPanel/ModeCaption", { pos: [0, -52], rect_size: [140, 20] });
  tx(b, "ControlPanel/ModeCaption", { FontSize: 13, MinSize: 10, MaxSize: 14, FontColor: col(0.78, 0.86, 0.92, 1) });
  b.patch("ControlPanel/ModeToggleBtn", { pos: [-48, -94], rect_size: [88, 56] });
  b.patch("ControlPanel/ModeAutoBtn", { pos: [48, -94], rect_size: [88, 56] });
  for (const id of ["ControlPanel/ModeToggleBtn", "ControlPanel/ModeAutoBtn"]) {
    sp(b, id, { Color: col(0.095, 0.064, 0.04, 0.96), Type: 1, DropShadow: true, DropShadowDistance: 1.5 });
    tx(b, id, { FontSize: 17, MinSize: 13, MaxSize: 18, Bold: true, FontColor: col(1, 0.93, 0.78, 1) });
    btn(b, id);
  }
  b.patch("ControlPanel/DirUpBtn", { pos: [0, -154], rect_size: [64, 64] });
  b.patch("ControlPanel/DirLeftBtn", { pos: [-66, -220], rect_size: [64, 64] });
  b.patch("ControlPanel/DirRightBtn", { pos: [66, -220], rect_size: [64, 64] });
  b.patch("ControlPanel/DirDownBtn", { pos: [0, -286], rect_size: [64, 64] });
  for (const id of ["ControlPanel/DirUpBtn", "ControlPanel/DirLeftBtn", "ControlPanel/DirRightBtn", "ControlPanel/DirDownBtn"]) {
    sp(b, id, { Color: col(0.11, 0.078, 0.052, 0.97), Type: 1, DropShadow: true, DropShadowDistance: 2 });
    tx(b, id, { FontSize: 24, MinSize: 18, MaxSize: 25, Bold: true, FontColor: col(1, 0.88, 0.64, 1) });
    btn(b, id);
  }
  b.patch("ControlPanel/TargetStateText", { pos: [0, 100], rect_size: [212, 20] });
  b.patch("ControlPanel/TargetBtn", { pos: [0, 58], rect_size: [176, 64] });
  tx(b, "ControlPanel/TargetStateText", { FontSize: 13, MinSize: 10, MaxSize: 14, FontColor: col(0.86, 0.94, 1, 1) });
  tx(b, "ControlPanel/TargetBtn", { FontSize: 17, MinSize: 13, MaxSize: 18, Bold: true, FontColor: col(1, 0.92, 0.74, 1) });

  b.patch("SkillOrderPanel", { anchor: "top-left", pos: [122, -315], rect_size: [220, 520], pivot: [0.5, 0.5] });
  sp(b, "SkillOrderPanel", { Color: col(0.012, 0.014, 0.018, 0.82), Type: 1, DropShadow: true, DropShadowDistance: 2 });
  b.patch("SkillOrderPanel/OrderTitleText", { anchor: "top-center", pos: [0, -34], rect_size: [190, 38], pivot: [0.5, 0.5] });
  tx(b, "SkillOrderPanel/OrderTitleText", { Text: "\uC2A4\uD0AC \uC21C\uC11C", FontSize: 18, MinSize: 14, MaxSize: 20, Bold: true, FontColor: col(1, 0.84, 0.3, 1), Alignment: 4, Overflow: 2 });
  const ys = [-86, -140, -194, -248, -302, -356, -410, -464];
  for (let i = 1; i <= 8; i += 1) {
    const id = `SkillOrderPanel/Slot${i}Btn`;
    b.patch(id, { anchor: "top-center", pos: [0, ys[i - 1]], rect_size: [184, 46], pivot: [0.5, 0.5] });
    sp(b, id, { Color: col(0.13, 0.09, 0.055, 0.98), Type: 1, DropShadow: true, DropShadowDistance: 1, RaycastTarget: true });
    tx(b, id, { Text: "", FontSize: 1, MinSize: 1, MaxSize: 1, FontColor: col(1, 1, 1, 0) });
    b.upsertComponent(id, "MOD.Core.UITouchReceiveComponent", { "@type": "MOD.Core.UITouchReceiveComponent", Enable: true });
    try {
      b.getId(`${id}/Icon`);
      b.patch(`${id}/Icon`, { anchor: "middle-left", pos: [8, 0], rect_size: [26, 26], pivot: [0, 0.5] });
    } catch (_) {
      b.sprite(`${id}/Icon`, { anchor: "middle-left", pos: [8, 0], rect_size: [26, 26], pivot: [0, 0.5], raycast: false });
    }
    sp(b, `${id}/Icon`, { Color: col(1, 1, 1, 1), PreserveAspect: true, RaycastTarget: false });
    try {
      b.getId(`${id}/OrderBadge`);
      b.patch(`${id}/OrderBadge`, { anchor: "middle-left", pos: [38, 0], rect_size: [22, 22], pivot: [0, 0.5] });
    } catch (_) {
      b.sprite(`${id}/OrderBadge`, { anchor: "middle-left", pos: [38, 0], rect_size: [22, 22], pivot: [0, 0.5], raycast: false });
    }
    sp(b, `${id}/OrderBadge`, { Color: col(0.95, 0.74, 0.24, 0.95), Type: 1, RaycastTarget: false });
    try {
      b.getId(`${id}/OrderText`);
      b.patch(`${id}/OrderText`, { anchor: "middle-left", pos: [32, 0], rect_size: [34, 32], pivot: [0, 0.5] });
    } catch (_) {
      b.text(`${id}/OrderText`, "", { anchor: "middle-left", pos: [32, 0], rect_size: [34, 32], pivot: [0, 0.5] });
    }
    tx(b, `${id}/OrderText`, { FontSize: 12, MinSize: 9, MaxSize: 13, Bold: true, FontColor: col(0.08, 0.05, 0.02, 1) });
    try {
      b.getId(`${id}/Label`);
      b.patch(`${id}/Label`, { anchor: "middle-left", pos: [66, 0], rect_size: [112, 38], pivot: [0, 0.5] });
    } catch (_) {
      b.text(`${id}/Label`, "", { anchor: "middle-left", pos: [66, 0], rect_size: [112, 38], pivot: [0, 0.5] });
    }
    tx(b, `${id}/Label`, { FontSize: 13, MinSize: 9, MaxSize: 14, Bold: true, FontColor: col(1, 0.93, 0.72, 1), Alignment: 3, Overflow: 2 });
    btn(b, id);
  }
  b.write("ui/CombatControlHUDGroup.ui");
}

{
  const b = UIBuilder.read("ui/SkillHUDGroup.ui");
  b.patch("Root", { anchor: "bottom-left", pos: [28, 28], rect_size: [558, 184], pivot: [0, 0] });
  b.patch("Root/Bg", { anchor: "stretch", pos: [0, 0], rect_size: [558, 184], pivot: [0.5, 0.5] });
  sp(b, "Root/Bg", { Color: col(0.014, 0.017, 0.024, 0.76), Type: 1, DropShadow: true, DropShadowDistance: 2 });
  b.patch("Root/Title", { anchor: "top-left", pos: [16, -12], rect_size: [82, 28], pivot: [0, 1] });
  tx(b, "Root/Title", { Text: "\uC2A4\uD0AC", FontSize: 18, MinSize: 14, MaxSize: 19, Bold: true, FontColor: col(1, 0.82, 0.34, 1) });
  const xs = [112, 224, 336, 448, 112, 224, 336, 448];
  const ys = [-18, -18, -18, -18, -98, -98, -98, -98];
  for (let i = 1; i <= 8; i += 1) {
    const slot = `Root/Slot${i}`;
    b.patch(slot, { anchor: "top-left", pos: [xs[i - 1], ys[i - 1]], rect_size: [96, 72], pivot: [0, 1] });
    sp(b, slot, { Color: col(0.095, 0.066, 0.044, 0.88), Type: 1, DropShadow: false });
    try {
      b.getId(`${slot}/Icon`);
      b.patch(`${slot}/Icon`, { anchor: "top-center", pos: [0, -8], rect_size: [40, 40], pivot: [0.5, 1] });
    } catch (_) {
      b.sprite(`${slot}/Icon`, { anchor: "top-center", pos: [0, -8], rect_size: [40, 40], pivot: [0.5, 1], raycast: false });
    }
    sp(b, `${slot}/Icon`, { Color: col(1, 1, 1, 1), PreserveAspect: true, RaycastTarget: false });
    b.patch(`${slot}/Badge`, { anchor: "top-right", pos: [-3, -3], rect_size: [28, 14], pivot: [1, 1] });
    b.patch(`${slot}/Badge/BadgeText`, { rect_size: [28, 14] });
    tx(b, `${slot}/Badge/BadgeText`, { FontSize: 10, MinSize: 8, MaxSize: 11, Bold: true, FontColor: col(1, 1, 1, 1) });
    b.patch(`${slot}/LevelText`, { anchor: "top-left", pos: [7, -6], rect_size: [42, 15], pivot: [0, 1] });
    tx(b, `${slot}/LevelText`, { Alignment: 3, FontSize: 10, MinSize: 8, MaxSize: 11, Bold: true, FontColor: col(1, 0.9, 0.55, 1) });
    b.patch(`${slot}/NameText`, { anchor: "bottom-center", pos: [0, 5], rect_size: [90, 20], pivot: [0.5, 0] });
    tx(b, `${slot}/NameText`, { FontSize: 10, MinSize: 8, MaxSize: 11, Bold: true, FontColor: col(0.96, 0.98, 1, 1) });
  }
  b.write("ui/SkillHUDGroup.ui");
}

{
  const b = UIBuilder.read("ui/ChoicePopupGroup.ui");
  sp(b, "Dimmer", { Color: col(0, 0, 0, 0.64), RaycastTarget: true });
  b.patch("TitleBar", { anchor: "middle-center", pos: [0, 330], rect_size: [760, 86], pivot: [0.5, 0.5] });
  sp(b, "TitleBar", { Color: col(0.06, 0.039, 0.026, 0.96), Type: 1, DropShadow: true, DropShadowDistance: 4 });
  b.patch("TitleBar/Title", { rect_size: [680, 54] });
  tx(b, "TitleBar/Title", {
    FontSize: 34,
    MinSize: 25,
    MaxSize: 36,
    Bold: true,
    FontColor: col(1, 0.85, 0.36, 1),
    Alignment: 4,
    UseOutLine: true,
    OutlineColor: col(0.18, 0.08, 0.02, 0.95),
    OutlineWidth: 1.6,
  });

  for (let i = 1; i <= 5; i += 1) {
    const card = `Card${i}`;
    sp(b, card, { Color: col(0.07, 0.09, 0.13, 0.98), Type: 1, DropShadow: true, DropShadowDistance: 5 });
    tx(b, card, { FontSize: 1, MinSize: 1, MaxSize: 1, FontColor: col(1, 1, 1, 0) });
    btn(b, card);

    b.patch(`${card}/GradeBorder`, { pos: [0, -16], rect_size: [268, 170] });
    sp(b, `${card}/GradeBorder`, { Color: col(0.58, 0.68, 0.82, 0.92), Type: 1, DropShadow: true, DropShadowDistance: 1.5 });
    b.patch(`${card}/IconSlot`, { pos: [0, -30], rect_size: [132, 132] });
    sp(b, `${card}/IconSlot`, { Color: col(0.12, 0.14, 0.18, 0.96), Type: 1, DropShadow: true, DropShadowDistance: 1.5 });
    b.patch(`${card}/Icon`, { pos: [0, -30], rect_size: [94, 94] });
    sp(b, `${card}/Icon`, { Color: col(1, 1, 1, 1), PreserveAspect: true });
    b.patch(`${card}/GradeText`, { pos: [0, -142], rect_size: [170, 24] });
    tx(b, `${card}/GradeText`, { FontSize: 15, MinSize: 11, MaxSize: 16, Bold: true, Alignment: 4, FontColor: col(1, 0.86, 0.4, 1) });
    b.patch(`${card}/NameText`, { pos: [0, -198], rect_size: [258, 52] });
    tx(b, `${card}/NameText`, {
      FontSize: 25,
      MinSize: 17,
      MaxSize: 27,
      Bold: true,
      Alignment: 4,
      FontColor: col(0.98, 0.99, 1, 1),
      UseOutLine: true,
      OutlineColor: col(0, 0, 0, 0.86),
      OutlineWidth: 1.1,
    });
    b.patch(`${card}/DescText`, { pos: [0, -260], rect_size: [246, 54] });
    tx(b, `${card}/DescText`, { FontSize: 15, MinSize: 10, MaxSize: 16, Alignment: 1, FontColor: col(0.78, 0.84, 0.91, 1), LineSpacing: 1.08 });
    b.patchComponent(`${card}/Fx`, "MOD.Core.UISpriteParticleComponent", {
      Color: col(1, 0.86, 0.34, 0.82),
      ParticleCount: 1.35,
      ParticleSpeed: 0.85,
      ParticleLifeTime: 1.25,
      PlaySpeed: 1.08,
    });
  }

  const buttons = [
    ["BtnReroll", col(0.12, 0.08, 0.045, 0.98), col(1, 0.88, 0.54, 1)],
    ["BtnExpand", col(0.04, 0.11, 0.16, 0.98), col(0.72, 0.94, 1, 1)],
    ["BtnJobAdv", col(0.2, 0.09, 0.28, 0.98), col(1, 0.78, 1, 1)],
  ];
  for (const [id, bg, fg] of buttons) {
    sp(b, id, { Color: bg, Type: 1, DropShadow: true, DropShadowDistance: 3 });
    tx(b, id, { FontSize: 24, MinSize: 17, MaxSize: 26, Bold: true, Alignment: 4, FontColor: fg });
    btn(b, id);
  }
  tx(b, "LootText", { FontSize: 21, MinSize: 15, MaxSize: 23, Bold: true, Alignment: 4, FontColor: col(1, 0.9, 0.6, 1) });
  b.write("ui/ChoicePopupGroup.ui");
}

{
  const b = UIBuilder.read("ui/JobAdvancePopupGroup.ui");
  sp(b, "Dimmer", { Color: col(0, 0, 0, 0.72), Type: 1, RaycastTarget: true });
  b.patch("Panel", { anchor: "middle-center", pos: [0, 8], rect_size: [820, 660], pivot: [0.5, 0.5] });
  b.patch("Panel/Bg", { anchor: "stretch", pos: [0, 0], rect_size: [820, 660], pivot: [0.5, 0.5] });
  sp(b, "Panel/Bg", { Color: col(0.034, 0.026, 0.022, 0.98), Type: 1, DropShadow: true, DropShadowDistance: 6 });
  b.patch("Panel/Frame", { anchor: "stretch", pos: [0, 0], rect_size: [820, 660], pivot: [0.5, 0.5] });
  sp(b, "Panel/Frame", { Color: col(1, 0.78, 0.28, 0.92), Type: 1, DropShadow: true, DropShadowDistance: 2 });
  b.patch("Panel/Header", { anchor: "top-center", pos: [0, -52], rect_size: [650, 100], pivot: [0.5, 1] });
  sp(b, "Panel/Header", { Color: col(1, 0.86, 0.32, 0.98), Type: 1, DropShadow: true, DropShadowDistance: 3 });

  try {
    b.remove("Panel/Aura");
  } catch (_) {}

  try {
    b.getId("Panel/BurstFx");
    b.patch("Panel/BurstFx", { anchor: "middle-center", pos: [0, 82], rect_size: [420, 360], pivot: [0.5, 0.5], enable: false });
  } catch (_) {
    b.basicParticle("Panel/BurstFx", {
      anchor: "middle-center",
      pos: [0, 82],
      rect_size: [420, 360],
      pivot: [0.5, 0.5],
      particle_type: 3,
      color: col(1, 0.84, 0.28, 0.9),
      particle_size: 1.25,
      particle_speed: 0.8,
      particle_count: 1.2,
      particle_lifetime: 1.0,
      play_speed: 1.1,
      enable: false,
    });
  }

  try {
    b.getId("Panel/SparkFx");
    b.patch("Panel/SparkFx", { anchor: "middle-center", pos: [0, 58], rect_size: [680, 420], pivot: [0.5, 0.5], enable: false });
  } catch (_) {
    b.basicParticle("Panel/SparkFx", {
      anchor: "middle-center",
      pos: [0, 58],
      rect_size: [680, 420],
      pivot: [0.5, 0.5],
      particle_type: 5,
      color: col(0.76, 0.55, 1, 0.82),
      particle_size: 0.95,
      particle_speed: 0.55,
      particle_count: 0.9,
      particle_lifetime: 1.35,
      play_speed: 0.9,
      enable: false,
    });
  }

  b.patch("Panel/Emblem", { anchor: "middle-center", pos: [0, 92], rect_size: [250, 250], pivot: [0.5, 0.5], enable: false });
  sp(b, "Panel/Emblem", { Color: col(1, 0.95, 0.76, 0.98), Type: 0, DropShadow: true, DropShadowDistance: 3 });
  b.patch("Panel/Avatar", { anchor: "middle-center", pos: [0, 82], rect_size: [260, 330], pivot: [0.5, 0.5], enable: false });
  b.patch("Panel/TitleText", { anchor: "top-center", pos: [0, -64], rect_size: [660, 66], pivot: [0.5, 1] });
  tx(b, "Panel/TitleText", {
    FontSize: 40,
    MinSize: 29,
    MaxSize: 42,
    Bold: true,
    Alignment: 4,
    FontColor: col(1, 0.88, 0.36, 1),
    UseOutLine: true,
    OutlineColor: col(0.12, 0.055, 0.01, 1),
    OutlineWidth: 1.5,
  });
  b.patch("Panel/JobNameText", { anchor: "middle-center", pos: [0, -82], rect_size: [660, 62], pivot: [0.5, 0.5] });
  tx(b, "Panel/JobNameText", {
    FontSize: 36,
    MinSize: 25,
    MaxSize: 38,
    Bold: true,
    Alignment: 4,
    FontColor: col(0.93, 0.82, 1, 1),
    UseOutLine: true,
    OutlineColor: col(0.08, 0.025, 0.14, 0.95),
    OutlineWidth: 1.3,
  });
  b.patch("Panel/DescText", { anchor: "middle-center", pos: [0, -140], rect_size: [690, 56], pivot: [0.5, 0.5] });
  tx(b, "Panel/DescText", { FontSize: 20, MinSize: 15, MaxSize: 22, Alignment: 4, FontColor: col(0.84, 0.9, 0.98, 1), LineSpacing: 1.05 });
  b.patch("Panel/BtnConfirm", { anchor: "bottom-center", pos: [0, 72], rect_size: [340, 82], pivot: [0.5, 0] });
  sp(b, "Panel/BtnConfirm", { Color: col(0.84, 0.58, 0.16, 0.98), Type: 1, DropShadow: true, DropShadowDistance: 3 });
  tx(b, "Panel/BtnConfirm", {
    Text: "\uD655\uC778",
    FontSize: 28,
    MinSize: 20,
    MaxSize: 30,
    Bold: true,
    Alignment: 4,
    FontColor: col(0.12, 0.07, 0.02, 1),
    DropShadow: false,
  });
  btn(b, "Panel/BtnConfirm");
  b.write("ui/JobAdvancePopupGroup.ui");
}
