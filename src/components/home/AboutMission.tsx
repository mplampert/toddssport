import teamUniformsImg from "@/assets/service-team-uniforms.jpg";

export function AboutMission() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="order-2 lg:order-1">
            <div className="rounded-xl overflow-hidden shadow-xl">
              <img 
                src={teamUniformsImg}
                alt="Todd's Sporting Goods Team"
                className="w-full h-72 md:h-96 object-cover"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              About Todd's Sporting Goods
            </h2>
            <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>
                For over 35 years, Todd's Sporting Goods has been the trusted partner for local teams, schools, and organizations looking to gear up with quality custom apparel. What started as a small shop has grown into a full-service provider of screen printing, embroidery, team uniforms, and promotional products.
              </p>
              <p>
                We believe every athlete deserves to look and feel their best—whether it's a youth soccer league, a high school varsity team, or a corporate softball squad. Our dedicated reps work closely with coaches, athletic directors, and business owners to deliver personalized service, competitive pricing, and products that stand up to the demands of competition.
              </p>
              <p className="font-semibold text-primary">
                From the first practice to the championship game, Todd's has your team covered.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
