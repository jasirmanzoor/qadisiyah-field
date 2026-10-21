import { ParticleHero } from '@/components/ui/animated-hero'
// Demo Component
const ParticleHeroDemo = () => {
  return (
    <div className="min-h-screen w-full">
      <ParticleHero
        title="MINIMAL"
        subtitle="Clean Design"
        description="Less is more with this streamlined approach."
        particleCount={10}
        interactiveHint="Hover to Interact"
        primaryButton={{
          text: "Get Started",
          onClick: () => console.log("Started!")
        }}
      />
    </div>
  );
};

export default ParticleHeroDemo;
