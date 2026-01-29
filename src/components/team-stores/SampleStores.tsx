import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import sampleFootball from "@/assets/sample-store-football.jpg";
import sampleBaseball from "@/assets/sample-store-baseball.jpg";
import sampleSpirit from "@/assets/sample-store-spirit.jpg";

const sampleStores = [
  {
    id: 1,
    title: "Sample Football Store",
    image: sampleFootball,
  },
  {
    id: 2,
    title: "Sample Baseball/Softball Store",
    image: sampleBaseball,
  },
  {
    id: 3,
    title: "Sample School Spirit Store",
    image: sampleSpirit,
  },
];

export function SampleStores() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");

  const openModal = (image: string, title: string) => {
    setSelectedImage(image);
    setSelectedTitle(title);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setSelectedTitle("");
  };

  return (
    <section className="py-16 md:py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
          Sample Stores
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Click to see examples of what your team store could look like.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {sampleStores.map((store) => (
            <button
              key={store.id}
              onClick={() => openModal(store.image, store.title)}
              className="group relative rounded-xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src={store.image} 
                  alt={store.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-bold text-lg text-white">{store.title}</h3>
                <p className="text-white/70 text-sm">Click to view larger</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modal for larger image */}
      <Dialog open={!!selectedImage} onOpenChange={closeModal}>
        <DialogContent className="max-w-4xl p-2">
          <VisuallyHidden>
            <DialogTitle>{selectedTitle}</DialogTitle>
          </VisuallyHidden>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt={selectedTitle}
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
