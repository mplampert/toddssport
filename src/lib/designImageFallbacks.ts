// Static design image map — maps design codes to local assets
// These are bundled images for sample/placeholder designs

import classicMascot from "@/assets/designs/classic-mascot-volleyball.png";
import popularShield from "@/assets/designs/popular-volleyball-shield.png";
import retroScript from "@/assets/designs/retro-volleyball-script.png";
import volleyToVictory from "@/assets/designs/volley-to-victory.png";
import classicBlock from "@/assets/designs/classic-block-letters.png";
import boldStripe from "@/assets/designs/bold-diagonal-stripe.png";
import popularCircle from "@/assets/designs/popular-volleyball-circle.png";
import retroCursive from "@/assets/designs/retro-cursive-volleyball.png";
import spikeCompetition from "@/assets/designs/spike-the-competition.png";

export const DESIGN_IMAGE_FALLBACKS: Record<string, string> = {
  FCVB038: classicMascot,
  FCVB039: popularShield,
  FCVB035: retroScript,
  MBSN024: volleyToVictory,
  MBSN367: classicBlock,
  FCFB221: boldStripe,
  FCVB040: popularCircle,
  FCVB013: retroCursive,
  FCVB001: spikeCompetition,
};
