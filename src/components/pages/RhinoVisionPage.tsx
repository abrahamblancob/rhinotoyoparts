import { Navbar } from '../layout/Navbar';
import { Footer } from '../layout/Footer';
import { RhinoVisionSection } from '../sections/RhinoVisionSection';
import { motion } from 'framer-motion';

export function RhinoVisionPage() {
    return (
        <>
            <Navbar />
            <main className="min-h-screen">
                {/* Hero Header */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="rhino-vision-hero"
                >
                    <div className="rhino-container rhino-section-spacing">
                        <div className="rhino-vision-hero-content">


                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                                className="rhino-vision-hero-title"
                            >
                                Rhino <span className="rhino-text-red">Vision</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.6 }}
                                className="rhino-vision-hero-subtitle"
                            >
                                ¡Sabemos lo difícil que es ubicar el repuesto correcto!
                            </motion.p>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                                className="rhino-vision-hero-description"
                            >
                                Por eso creamos Rhino Vision: tu asistente inteligente que identifica repuestos Toyota al instante.
                                Simplemente sube una foto y nuestra IA te dirá exactamente qué pieza es, su condición,
                                y con qué modelos es compatible. ¡Todo en menos de 20 segundos!
                                Olvídate de buscar por horas, nosotros te ayudamos a encontrar lo que necesitas.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6, duration: 0.5 }}
                                className="rhino-vision-hero-badge"
                                style={{ marginTop: '24px', marginBottom: '0' }}
                            >
                                ✨ Powered by Wabyte AI
                            </motion.div>
                        </div>
                    </div>
                </motion.section>

                {/* Main Content */}
                <RhinoVisionSection />

                {/* Features Section */}
                <motion.section
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="rhino-vision-features"
                >
                    <div className="rhino-container rhino-section-spacing">
                        <h2 className="rhino-features-title">¿Por qué usar Rhino Vision?</h2>

                        <div className="rhino-features-grid">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.5 }}
                                viewport={{ once: true }}
                                className="rhino-feature-card"
                            >
                                <div className="rhino-feature-icon">🤖</div>
                                <h3>IA Avanzada</h3>
                                <p>Tecnología Google Gemini Vision para identificación precisa de repuestos</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                viewport={{ once: true }}
                                className="rhino-feature-card"
                            >
                                <div className="rhino-feature-icon">⚡</div>
                                <h3>Resultados Instantáneos</h3>
                                <p>Obtén información completa en menos de 20 segundos</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                viewport={{ once: true }}
                                className="rhino-feature-card"
                            >
                                <div className="rhino-feature-icon">🚗</div>
                                <h3>Compatibilidad Toyota</h3>
                                <p>Base de datos especializada en modelos Toyota</p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                viewport={{ once: true }}
                                className="rhino-feature-card"
                            >
                                <div className="rhino-feature-icon">💬</div>
                                <h3>Contacto Directo</h3>
                                <p>Conecta con nuestro equipo de ventas vía WhatsApp al instante</p>
                            </motion.div>
                        </div>
                    </div>
                </motion.section>
            </main>
            <Footer />
        </>
    );
}
