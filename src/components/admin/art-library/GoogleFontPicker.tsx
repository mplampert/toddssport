import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";

// Popular Google Fonts curated for design/sports templates
const POPULAR_FONTS = [
  // ── Athletic / Varsity ──
  "Alumni Sans Collegiate One",
  "Athletic",
  "Bungee",
  "Bungee Shade",
  "Bungee Inline",
  "Graduate",
  "Gravitas One",
  "Holtwood One SC",
  "Passion One",
  "Russo One",
  "Saira Stencil One",
  "Sigmar One",
  "Squada One",
  "Stint Ultra Expanded",
  "Titan One",
  "Ultra",
  // ── Bold / Block ──
  "Anton",
  "Archivo Black",
  "Bebas Neue",
  "Black Ops One",
  "Carter One",
  "Concert One",
  "Dela Gothic One",
  "Fredoka One",
  "Righteous",
  "Teko",
  // ── Condensed / Sports ──
  "Barlow Condensed",
  "Big Shoulders Display",
  "Big Shoulders Stencil Display",
  "Chakra Petch",
  "Kanit",
  "Oswald",
  "Rajdhani",
  "Roboto Condensed",
  "Saira Condensed",
  "Saira",
  "Yanone Kaffeesatz",
  // ── Script / Cursive ──
  "Lobster",
  "Pacifico",
  "Permanent Marker",
  "Playball",
  "Sedgwick Ave Display",
  // ── Display / Fun ──
  "Bangers",
  "Bungee Outline",
  "Nosifer",
  "Orbitron",
  "Press Start 2P",
  "Special Elite",
  // ── Clean / Modern ──
  "Cinzel",
  "Josefin Sans",
  "Lato",
  "Merriweather",
  "Montserrat",
  "Playfair Display",
  "Poppins",
  "Roboto",
  "Roboto Slab",
  "Rubik",
  // ── Stencil / Military ──
  "Black Han Sans",
  "Fugaz One",
  "Lacquer",
  "Secular One",
  "Sonsie One",
];

/** Load a Google Font into the page if not already loaded */
export function loadGoogleFont(fontFamily: string) {
  const id = `gfont-${fontFamily.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}&display=swap`;
  document.head.appendChild(link);
}

interface GoogleFontPickerProps {
  value: string;
  onChange: (font: string) => void;
}

export function GoogleFontPicker({ value, onChange }: GoogleFontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Load the currently selected font for preview
  useEffect(() => {
    if (value) loadGoogleFont(value);
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return POPULAR_FONTS;
    const q = search.toLowerCase();
    return POPULAR_FONTS.filter((f) => f.toLowerCase().includes(q));
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal text-sm h-9"
        >
          <span style={{ fontFamily: value }} className="truncate">
            {value || "Select font…"}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search fonts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <ScrollArea className="h-[240px]">
          <div className="p-1">
            {filtered.map((font) => {
              loadGoogleFont(font);
              return (
                <button
                  key={font}
                  className={`w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors ${
                    value === font ? "bg-accent font-medium" : ""
                  }`}
                  style={{ fontFamily: font }}
                  onClick={() => {
                    onChange(font);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {font}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-2 text-center">
                No matching fonts. Type the exact Google Font name and press Enter.
              </p>
            )}
          </div>
        </ScrollArea>
        {/* Allow custom entry */}
        {search.trim() && !POPULAR_FONTS.includes(search.trim()) && (
          <div className="border-t p-1">
            <button
              className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors text-primary"
              onClick={() => {
                onChange(search.trim());
                setOpen(false);
                setSearch("");
              }}
            >
              Use "{search.trim()}"
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
