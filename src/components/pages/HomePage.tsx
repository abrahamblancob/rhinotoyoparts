import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';
import { HeroSection } from '../sections/HeroSection';
import { AboutSection } from '../sections/AboutSection';
import { TiendaSection } from '../sections/TiendaSection';

export function HomePage() {
    return (
        <>
            <Navbar />
            <main>
                <HeroSection />
                <AboutSection />
                <TiendaSection />
            </main>
            <Footer />
        </>
    );
}
