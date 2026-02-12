interface ToyotaPart {
    category: string;
    subcategory: string;
    keywords: string[];
    compatibleModels: string[];
}

export const TOYOTA_PARTS_DATABASE: Record<string, ToyotaPart> = {
    // Motor - Lubricación
    'filtro_aceite': {
        category: 'Motor',
        subcategory: 'Lubricación',
        keywords: ['filtro', 'aceite', 'oil filter', 'lubricante'],
        compatibleModels: ['Corolla (2010-2023)', 'Yaris (2012-2023)', 'RAV4 (2013-2022)', 'Camry (2015-2023)']
    },
    'bomba_aceite': {
        category: 'Motor',
        subcategory: 'Lubricación',
        keywords: ['bomba', 'aceite', 'oil pump'],
        compatibleModels: ['Corolla (2010-2023)', 'Hilux (2012-2023)', 'Fortuner (2015-2023)']
    },

    // Motor - Sistema de enfriamiento
    'radiador': {
        category: 'Motor',
        subcategory: 'Enfriamiento',
        keywords: ['radiador', 'radiator', 'enfriamiento', 'cooling'],
        compatibleModels: ['Corolla (2010-2023)', 'Yaris (2012-2023)', 'RAV4 (2013-2022)']
    },
    'termostato': {
        category: 'Motor',
        subcategory: 'Enfriamiento',
        keywords: ['termostato', 'thermostat'],
        compatibleModels: ['Corolla (2010-2023)', 'Camry (2015-2023)', 'Hilux (2012-2023)']
    },

    // Frenos
    'pastilla_freno': {
        category: 'Frenos',
        subcategory: 'Pastillas',
        keywords: ['pastilla', 'freno', 'brake pad', 'balata'],
        compatibleModels: ['Corolla (2010-2023)', 'Yaris (2012-2023)', 'RAV4 (2013-2022)', 'Camry (2015-2023)']
    },
    'disco_freno': {
        category: 'Frenos',
        subcategory: 'Discos',
        keywords: ['disco', 'freno', 'brake disc', 'rotor'],
        compatibleModels: ['Corolla (2010-2023)', 'RAV4 (2013-2022)', 'Camry (2015-2023)', 'Hilux (2012-2023)']
    },

    // Suspensión
    'amortiguador': {
        category: 'Suspensión',
        subcategory: 'Amortiguadores',
        keywords: ['amortiguador', 'shock absorber', 'suspension'],
        compatibleModels: ['Corolla (2010-2023)', 'Yaris (2012-2023)', 'RAV4 (2013-2022)', 'Hilux (2012-2023)']
    },
    'rotula': {
        category: 'Suspensión',
        subcategory: 'Rótulas',
        keywords: ['rotula', 'ball joint', 'articulacion'],
        compatibleModels: ['Corolla (2010-2023)', 'Hilux (2012-2023)', 'Fortuner (2015-2023)']
    },

    // Eléctrico
    'alternador': {
        category: 'Eléctrico',
        subcategory: 'Carga',
        keywords: ['alternador', 'alternator', 'generador'],
        compatibleModels: ['Corolla (2010-2023)', 'Yaris (2012-2023)', 'Camry (2015-2023)']
    },
    'motor_arranque': {
        category: 'Eléctrico',
        subcategory: 'Arranque',
        keywords: ['motor arranque', 'starter', 'marcha'],
        compatibleModels: ['Corolla (2010-2023)', 'Hilux (2012-2023)', 'Fortuner (2015-2023)']
    },

    // Transmisión
    'embrague': {
        category: 'Transmisión',
        subcategory: 'Embrague',
        keywords: ['embrague', 'clutch', 'croche'],
        compatibleModels: ['Corolla (2010-2023)', 'Yaris (2012-2023)', 'Hilux (2012-2023)']
    },
    'caja_velocidades': {
        category: 'Transmisión',
        subcategory: 'Caja',
        keywords: ['caja', 'velocidades', 'transmission', 'gearbox'],
        compatibleModels: ['Corolla (2010-2023)', 'Camry (2015-2023)', 'Hilux (2012-2023)']
    }
};

export function findCompatiblePart(partType: string, category?: string): ToyotaPart | null {
    const normalizedPartType = partType.toLowerCase();

    // Buscar coincidencia exacta por clave
    for (const [key, part] of Object.entries(TOYOTA_PARTS_DATABASE)) {
        if (key === normalizedPartType) {
            return part;
        }
    }

    // Buscar por keywords
    for (const part of Object.values(TOYOTA_PARTS_DATABASE)) {
        const matchesKeyword = part.keywords.some(keyword =>
            normalizedPartType.includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(normalizedPartType)
        );

        const matchesCategory = !category || part.category.toLowerCase() === category.toLowerCase();

        if (matchesKeyword && matchesCategory) {
            return part;
        }
    }

    // Si hay categoría, devolver un genérico de esa categoría
    if (category) {
        for (const part of Object.values(TOYOTA_PARTS_DATABASE)) {
            if (part.category.toLowerCase() === category.toLowerCase()) {
                return part;
            }
        }
    }

    return null;
}

export function getAllCategories(): string[] {
    const categories = new Set<string>();
    Object.values(TOYOTA_PARTS_DATABASE).forEach(part => {
        categories.add(part.category);
    });
    return Array.from(categories);
}
