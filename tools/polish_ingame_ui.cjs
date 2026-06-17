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

  b.patch("SkillOrderPanel", { anchor: "bottom-left", pos: [26, 126], rect_size: [326, 188], pivot: [0, 0] });
  sp(b, "SkillOrderPanel", { Color: col(0.012, 0.014, 0.018, 0.9), Type: 1, DropShadow: true, DropShadowDistance: 2 });
  b.patch("SkillOrderPanel/OrderTitleText", { pos: [0, 76], rect_size: [284, 26], pivot: [0.5, 0.5] });
  tx(b, "SkillOrderPanel/OrderTitleText", { Text: "\uC2A4\uD0AC \uC21C\uC11C", FontSize: 16, MinSize: 13, MaxSize: 17, Bold: true, FontColor: col(1, 0.84, 0.3, 1) });
  const xs = [-74, 74, -74, 74, -74, 74, -74, 74];
  const ys = [42, 42, 6, 6, -30, -30, -66, -66];
  for (let i = 1; i <= 8; i += 1) {
    const id = `SkillOrderPanel/Slot${i}Btn`;
    b.patch(id, { pos: [xs[i - 1], ys[i - 1]], rect_size: [136, 32] });
    sp(b, id, { Color: col(0.13, 0.09, 0.055, 0.98), Type: 1, DropShadow: true, DropShadowDistance: 1 });
    tx(b, id, { FontSize: 12, MinSize: 8, MaxSize: 13, Bold: true, FontColor: col(1, 0.93, 0.72, 1) });
    btn(b, id);
  }
  b.write("ui/CombatControlHUDGroup.ui");
}

{
  const b = UIBuilder.read("ui/SkillHUDGroup.ui");
  b.patch("Root", { anchor: "bottom-left", pos: [28, 24], rect_size: [326, 106], pivot: [0, 0] });
  b.patch("Root/Bg", { anchor: "stretch", pos: [0, 0], rect_size: [326, 106], pivot: [0.5, 0.5] });
  sp(b, "Root/Bg", { Color: col(0.014, 0.017, 0.024, 0.76), Type: 1, DropShadow: true, DropShadowDistance: 2 });
  b.patch("Root/Title", { anchor: "top-left", pos: [14, -10], rect_size: [66, 24], pivot: [0, 1] });
  tx(b, "Root/Title", { Text: "\uC2A4\uD0AC", FontSize: 17, MinSize: 13, MaxSize: 18, Bold: true, FontColor: col(1, 0.82, 0.34, 1) });
  const xs = [84, 144, 204, 264, 84, 144, 204, 264];
  const ys = [-14, -14, -14, -14, -56, -56, -56, -56];
  for (let i = 1; i <= 8; i += 1) {
    const slot = `Root/Slot${i}`;
    b.patch(slot, { anchor: "top-left", pos: [xs[i - 1], ys[i - 1]], rect_size: [52, 36], pivot: [0, 1] });
    sp(b, slot, { Color: col(0.095, 0.066, 0.044, 0.88), Type: 1, DropShadow: false });
    b.patch(`${slot}/Badge`, { anchor: "top-right", pos: [-3, -2], rect_size: [26, 13], pivot: [1, 1] });
    b.patch(`${slot}/Badge/BadgeText`, { rect_size: [26, 13] });
    tx(b, `${slot}/Badge/BadgeText`, { FontSize: 9, MinSize: 7, MaxSize: 10, Bold: true, FontColor: col(1, 1, 1, 1) });
    b.patch(`${slot}/LevelText`, { anchor: "top-center", pos: [0, -16], rect_size: [48, 14], pivot: [0.5, 0.5] });
    tx(b, `${slot}/LevelText`, { Alignment: 4, FontSize: 10, MinSize: 8, MaxSize: 11, Bold: true, FontColor: col(1, 0.9, 0.55, 1) });
    b.patch(`${slot}/NameText`, { anchor: "bottom-center", pos: [0, 4], rect_size: [48, 18], pivot: [0.5, 0] });
    tx(b, `${slot}/NameText`, { FontSize: 8, MinSize: 6, MaxSize: 9, Bold: true, FontColor: col(0.96, 0.98, 1, 1) });
  }
  b.write("ui/SkillHUDGroup.ui");
}
