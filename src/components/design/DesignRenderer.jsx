import { elementText } from "../../lib/design/model";

/**
 * DesignRenderer — renders a { canvas, elements } design as DOM.
 *
 * Used both for read-only display (student certificate / poster) and as the
 * static layer inside the editor. Text uses CSS so it stays crisp at any size;
 * export uses the canvas renderer instead (renderCanvas.js).
 *
 * Props:
 *   design           { canvas, elements }
 *   data             resolved variable values
 *   width            target display width in px (height derived from ratio)
 *   showPlaceholders show dashed boxes for empty images / certificate frames
 *   certDesign       the certificate design to embed inside `certificate` elements
 */
export default function DesignRenderer({
  design,
  data = {},
  width = 760,
  showPlaceholders = false,
  certDesign = null,
}) {
  if (!design || !design.canvas) return null;
  const { canvas, elements } = design;
  const cw = canvas.width || 1414;
  const ch = canvas.height || 1000;
  const scale = width / cw;
  const height = ch * scale;

  const bg = canvas.background || {};
  const frame = canvas.frame || null;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background: bg.type === "image" && bg.src ? "#000" : bg.color || "#0A0E16",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      {bg.type === "image" && bg.src && (
        <img
          src={bg.src}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Frame borders */}
      {frame && frame.color && (
        <div
          style={{
            position: "absolute",
            inset: frame.inset || 18,
            border: `${(frame.width || 2) * scale}px solid ${frame.color}`,
            borderRadius: (frame.radius || 0) * scale,
            pointerEvents: "none",
          }}
        />
      )}
      {frame && frame.innerColor && (
        <div
          style={{
            position: "absolute",
            inset: frame.innerInset || 30,
            border: `${(frame.innerWidth || 1) * scale}px solid ${frame.innerColor}`,
            borderRadius: (frame.radius || 0) * scale,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Scaled design space */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: cw,
          height: ch,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {elements
          .filter((el) => !el.hidden)
          .map((el) => (
            <ElementView
              key={el.id}
              el={el}
              data={data}
              showPlaceholders={showPlaceholders}
              certDesign={certDesign}
              cw={cw}
              ch={ch}
            />
          ))}
      </div>
    </div>
  );
}

function ElementView({ el, data, showPlaceholders, certDesign, cw, ch }) {
  const box = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  };

  if (el.type === "text") {
    const s = el.style || {};
    const raw = elementText(el, data);
    const text = s.uppercase ? String(raw).toUpperCase() : raw;
    return (
      <div
        style={{
          ...box,
          display: "flex",
          alignItems: "center",
          justifyContent:
            s.align === "left" ? "flex-start" : s.align === "right" ? "flex-end" : "center",
          fontFamily: s.fontFamily || "'Inter', sans-serif",
          fontSize: s.fontSize || 24,
          fontWeight: s.fontWeight || 400,
          fontStyle: s.italic ? "italic" : "normal",
          color: s.color || "#fff",
          textAlign: s.align || "center",
          lineHeight: s.lineHeight || 1.2,
          letterSpacing: `${s.letterSpacing || 0}px`,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          textShadow: s.shadow ? "0 2px 8px rgba(0,0,0,0.55)" : undefined,
        }}
      >
        <span style={{ width: "100%" }}>{text}</span>
      </div>
    );
  }

  if (el.type === "image") {
    if (!el.src) {
      if (!showPlaceholders) return null;
      return (
        <div
          style={{
            ...box,
            border: "2px dashed rgba(255,255,255,0.35)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.5)",
            fontSize: 13,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {el.name || "Image"}
        </div>
      );
    }
    return (
      <img
        src={el.src}
        alt=""
        style={{
          ...box,
          objectFit: el.fit || "contain",
          pointerEvents: "none",
        }}
      />
    );
  }

  if (el.type === "shape") {
    const isLine = el.shape === "line";
    return (
      <div
        style={{
          ...box,
          background: el.fill || "transparent",
          border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke || "transparent"}` : undefined,
          borderRadius: el.shape === "ellipse" ? "50%" : isLine ? 0 : el.radius || 0,
        }}
      />
    );
  }

  if (el.type === "certificate") {
    if (certDesign) {
      return (
        <div style={{ ...box, overflow: "hidden", borderRadius: 6 }}>
          <DesignRenderer design={certDesign} data={data} width={el.w} />
        </div>
      );
    }
    if (!showPlaceholders) return null;
    return (
      <div
        style={{
          ...box,
          border: "2px dashed rgba(255,255,255,0.3)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.5)",
          fontSize: 13,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        Certificate
      </div>
    );
  }

  return null;
}