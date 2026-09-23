import { repo } from "@/lib/data";
import { ThemeShowcase } from "@/components/preview/theme-showcase";

/**
 * Side-by-side comparison of the three candidate UI directions.
 *
 * Rendered with the real components and the real fixture data, so what is
 * chosen here is what ships — the winning direction becomes the token values
 * in globals.css and this route is deleted.
 */
export default async function PreviewPage() {
  const cars = await repo.listCars();
  return <ThemeShowcase cars={cars} />;
}
