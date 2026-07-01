"use client";

import * as React from "react";
import { Rows3, Rows4 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Density = "compact" | "comfortable";

export function DensityToggle() {
  const [density, setDensity] = React.useState<Density>("compact");

  React.useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-density") as Density) ||
      "compact";
    setDensity(current);
  }, []);

  function toggle() {
    const next: Density = density === "compact" ? "comfortable" : "compact";
    setDensity(next);
    document.documentElement.setAttribute("data-density", next);
    try {
      localStorage.setItem("density", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cambiar densidad"
      title={density === "compact" ? "Densidad: compacta" : "Densidad: cómoda"}
      onClick={toggle}
    >
      {density === "compact" ? (
        <Rows4 className="size-4" />
      ) : (
        <Rows3 className="size-4" />
      )}
    </Button>
  );
}
