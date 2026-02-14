const items = [
  "100+ Team Stores Launched",
  "30+ Years in Business",
  "No Minimums",
  "Free Setup",
  "Built-In Fundraising",
];

export function TrustBar() {
  return (
    <section className="bg-secondary py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs md:text-sm text-muted-foreground text-center">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="hidden sm:inline text-border">|</span>}
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
