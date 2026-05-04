(function () {
  "use strict";

  const SEED_DATE = "2026-05-02";
  const SEED_SOURCE = "doc_ACTIVOS_base";

  const CATEGORY_LABELS = {
    stock: "Acciones",
    bond: "Bonos",
    real_estate: "Bienes raices",
    business: "Empresas",
    commodity: "Commodities",
    crypto: "Crypto",
    collectible: "Coleccionables"
  };

  const SECTOR_CONFIG = {
    technology: createSector("Tecnologia", 1.25, 1.25, [0.035, -0.012, -0.055, 0.044]),
    healthcare: createSector("Salud", 0.72, 0.82, [0.012, 0.004, -0.012, 0.014]),
    finance: createSector("Finanzas", 1.1, 1.05, [0.024, -0.006, -0.042, 0.032]),
    energy: createSector("Energia", 0.95, 1.12, [0.028, 0.018, -0.032, 0.014]),
    discretionary: createSector("Consumo discrecional", 1.02, 1.02, [0.026, 0.002, -0.038, 0.03]),
    staples: createSector("Consumo basico", 0.58, 0.62, [0.01, 0.008, -0.006, 0.012]),
    industrial: createSector("Industrial", 1.08, 1.08, [0.022, 0.002, -0.034, 0.032]),
    automotive: createSector("Automotriz", 1.28, 1.25, [0.026, -0.006, -0.048, 0.036]),
    telecom: createSector("Telecom", 0.68, 0.66, [0.008, 0.004, -0.01, 0.01]),
    media: createSector("Media", 1.08, 1.08, [0.022, -0.004, -0.036, 0.032]),
    travel: createSector("Turismo", 1.42, 1.35, [0.038, 0.004, -0.066, 0.046]),
    sovereign_bonds: createSector("Bonos soberanos", -0.22, 0.28, [0.004, -0.004, 0.018, 0.007]),
    corporate_bonds: createSector("Bonos corporativos", 0.32, 0.42, [0.01, -0.006, -0.018, 0.014]),
    real_estate: createSector("Real estate", 0.55, 0.38, [0.02, -0.008, -0.025, 0.018]),
    food: createSector("Gastronomia", 0.82, 0.7, [0.018, 0.004, -0.018, 0.02]),
    retail: createSector("Retail", 0.9, 0.82, [0.02, 0.002, -0.028, 0.024]),
    services: createSector("Servicios", 0.78, 0.72, [0.016, 0.004, -0.02, 0.02]),
    logistics: createSector("Logistica", 0.98, 0.9, [0.02, 0.004, -0.026, 0.026]),
    construction: createSector("Construccion", 1.05, 0.95, [0.024, -0.006, -0.034, 0.032]),
    software: createSector("Software", 1.22, 1.15, [0.032, -0.012, -0.045, 0.042]),
    hospitality: createSector("Hoteleria", 1.18, 1.05, [0.034, 0.002, -0.052, 0.04]),
    banking: createSector("Banca", 1.05, 0.92, [0.018, -0.004, -0.034, 0.028]),
    precious_metals: createSector("Metales preciosos", -0.18, 0.78, [-0.002, 0.012, 0.036, 0.004]),
    energy_commodities: createSector("Energia fisica", 0.72, 1.15, [0.026, 0.02, -0.04, 0.016]),
    agriculture: createSector("Agricultura", 0.42, 0.95, [0.012, 0.014, -0.012, 0.01]),
    industrial_metals: createSector("Metales industriales", 0.86, 1.04, [0.024, 0.006, -0.032, 0.022]),
    crypto: createSector("Crypto", 1.65, 2.15, [0.052, -0.018, -0.082, 0.066]),
    collectibles: createSector("Coleccionables", 0.22, 0.65, [0.018, 0.004, -0.012, 0.014])
  };

  const STOCK_ROWS = [
    ["AAPL", "Apple Inc.", "apple.com", 195, 1.0, 1.2, 0.005, "technology"],
    ["MSFT", "Microsoft", "microsoft.com", 420, 0.9, 1.0, 0.007, "technology"],
    ["GOOGL", "Alphabet", "google.com", 185, 1.1, 1.1, 0, "technology"],
    ["META", "Meta Platforms", "meta.com", 510, 1.4, 1.3, 0.004, "technology"],
    ["NVDA", "Nvidia", "nvidia.com", 920, 1.8, 1.7, 0, "technology"],
    ["AMZN", "Amazon", "amazon.com", 190, 1.2, 1.2, 0, "technology"],
    ["TSLA", "Tesla", "tesla.com", 245, 2.0, 1.8, 0, "technology"],
    ["JNJ", "Johnson & Johnson", "jnj.com", 158, 0.7, 0.6, 0.03, "healthcare"],
    ["PFE", "Pfizer", "pfizer.com", 28, 1.1, 0.8, 0.06, "healthcare"],
    ["LLY", "Eli Lilly", "lilly.com", 780, 1.0, 0.7, 0.007, "healthcare"],
    ["MRNA", "Moderna", "modernatx.com", 98, 2.0, 1.4, 0, "healthcare"],
    ["JPM", "JPMorgan Chase", "jpmorganchase.com", 215, 1.0, 1.2, 0.024, "finance"],
    ["BAC", "Bank of America", "bankofamerica.com", 42, 1.1, 1.3, 0.025, "finance"],
    ["V", "Visa", "visa.com", 285, 0.8, 0.95, 0.007, "finance"],
    ["MA", "Mastercard", "mastercard.com", 480, 0.9, 1.0, 0.006, "finance"],
    ["GS", "Goldman Sachs", "goldmansachs.com", 480, 1.2, 1.4, 0.025, "finance"],
    ["XOM", "Exxon Mobil", "exxonmobil.com", 115, 1.1, 1.0, 0.034, "energy"],
    ["CVX", "Chevron", "chevron.com", 148, 1.0, 0.9, 0.042, "energy"],
    ["SHEL", "Shell", "shell.com", 72, 1.1, 1.0, 0.04, "energy"],
    ["MCD", "McDonald's", "mcdonalds.com", 295, 0.7, 0.9, 0.024, "discretionary"],
    ["SBUX", "Starbucks", "starbucks.com", 92, 1.0, 1.1, 0.025, "discretionary"],
    ["NKE", "Nike", "nike.com", 82, 1.0, 1.2, 0.02, "discretionary"],
    ["HD", "Home Depot", "homedepot.com", 360, 0.9, 1.1, 0.026, "discretionary"],
    ["LVMUY", "LVMH", "lvmh.com", 142, 1.0, 1.2, 0.018, "discretionary"],
    ["KO", "Coca-Cola", "coca-cola.com", 63, 0.5, 0.5, 0.03, "staples"],
    ["PEP", "PepsiCo", "pepsico.com", 172, 0.6, 0.6, 0.034, "staples"],
    ["WMT", "Walmart", "walmart.com", 76, 0.6, 0.7, 0.014, "staples"],
    ["PG", "Procter & Gamble", "pg.com", 168, 0.5, 0.5, 0.025, "staples"],
    ["BA", "Boeing", "boeing.com", 215, 1.4, 1.3, 0, "industrial"],
    ["CAT", "Caterpillar", "caterpillar.com", 355, 1.0, 1.1, 0.018, "industrial"],
    ["GE", "General Electric", "ge.com", 172, 1.1, 1.2, 0.007, "industrial"],
    ["F", "Ford Motor", "ford.com", 11, 1.3, 1.4, 0.05, "automotive"],
    ["GM", "General Motors", "gm.com", 46, 1.3, 1.4, 0.01, "automotive"],
    ["TM", "Toyota", "toyota.com", 185, 0.9, 0.9, 0.025, "automotive"],
    ["T", "AT&T", "att.com", 19, 0.7, 0.7, 0.065, "telecom"],
    ["VZ", "Verizon", "verizon.com", 42, 0.6, 0.6, 0.063, "telecom"],
    ["NFLX", "Netflix", "netflix.com", 620, 1.4, 1.3, 0, "media"],
    ["DIS", "Walt Disney", "disney.com", 108, 1.0, 1.1, 0.01, "media"],
    ["UAL", "United Airlines", "united.com", 58, 1.7, 1.5, 0, "travel"],
    ["DAL", "Delta Air Lines", "delta.com", 52, 1.6, 1.5, 0.01, "travel"]
  ];

  const BOND_ROWS = [
    ["UST-2Y", "US Treasury 2Y", "treasury.gov", 0.045, 730, "AAA", 1000, "sovereign_bonds"],
    ["UST-10Y", "US Treasury 10Y", "treasury.gov", 0.042, 3650, "AAA", 1000, "sovereign_bonds"],
    ["UST-30Y", "US Treasury 30Y", "treasury.gov", 0.045, 10950, "AAA", 1000, "sovereign_bonds"],
    ["BUND-10Y", "German Bund 10Y", "bundesfinanzministerium.de", 0.025, 3650, "AAA", 1000, "sovereign_bonds"],
    ["JGB-10Y", "Japan Govt Bond 10Y", "mof.go.jp", 0.01, 3650, "A+", 1000, "sovereign_bonds"],
    ["AR-USD", "Argentina USD 10Y", "argentina.gob.ar", 0.12, 3650, "CCC", 1000, "sovereign_bonds"],
    ["AAPL-10Y", "Apple Bond 10Y", "apple.com", 0.048, 3650, "AA+", 1000, "corporate_bonds"],
    ["MSFT-10Y", "Microsoft Bond 10Y", "microsoft.com", 0.047, 3650, "AAA", 1000, "corporate_bonds"],
    ["TSLA-5Y", "Tesla Bond 5Y", "tesla.com", 0.065, 1825, "BB+", 1000, "corporate_bonds"],
    ["F-7Y", "Ford Bond 7Y", "ford.com", 0.075, 2555, "BB", 1000, "corporate_bonds"]
  ];

  const PROPERTY_CITY_META = {
    "Buenos Aires": { country: "Argentina", region: "Cono Sur" },
    "Nueva York": { country: "Estados Unidos", region: "Norteamerica" },
    Miami: { country: "Estados Unidos", region: "Norteamerica" },
    Madrid: { country: "Espana", region: "Europa" },
    Londres: { country: "Reino Unido", region: "Europa" },
    Tokio: { country: "Japon", region: "Asia" },
    Dubai: { country: "Emiratos Arabes Unidos", region: "Medio Oriente" },
    Bogota: { country: "Colombia", region: "Colombia" },
    Medellin: { country: "Colombia", region: "Colombia" },
    Cartagena: { country: "Colombia", region: "Colombia" },
    Cali: { country: "Colombia", region: "Colombia" },
    "Ciudad de Mexico": { country: "Mexico", region: "Latam" },
    "Sao Paulo": { country: "Brasil", region: "Latam" },
    Santiago: { country: "Chile", region: "Latam" },
    Lima: { country: "Peru", region: "Latam" },
    Panama: { country: "Panama", region: "Latam" },
    Singapur: { country: "Singapur", region: "Asia" }
  };

  const PROPERTY_ROWS = [
    ["PAL-SOHO", "Departamento en Palermo Soho", "Residencial", "Buenos Aires", 145000, 950, 130],
    ["REC-LOFT", "Loft en Recoleta", "Residencial", "Buenos Aires", 280000, 1800, 220],
    ["SF-LOCAL", "Local comercial en Av. Santa Fe", "Comercial", "Buenos Aires", 420000, 3200, 400],
    ["CAT-OFI", "Oficina en Catalinas Norte", "Oficina", "Buenos Aires", 850000, 6200, 800],
    ["NOR-CASA", "Casa en Nordelta", "Residencial", "Buenos Aires", 620000, 3800, 500],
    ["NYC-MID", "Studio en Midtown", "Residencial", "Nueva York", 680000, 3400, 650],
    ["NYC-UES", "Apartment 2BR en Upper East Side", "Residencial", "Nueva York", 2400000, 11500, 1800],
    ["NYC-TRI", "Penthouse en Tribeca", "Residencial", "Nueva York", 8500000, 42000, 5500],
    ["NYC-WST", "Office floor en Wall Street", "Oficina", "Nueva York", 14500000, 95000, 12000],
    ["NYC-SOHO", "Storefront en SoHo", "Comercial", "Nueva York", 4800000, 32000, 4200],
    ["MIA-BRK", "Condo en Brickell", "Residencial", "Miami", 620000, 3800, 550],
    ["MIA-SIB", "Penthouse en Sunny Isles Beach", "Residencial", "Miami", 4200000, 24000, 3200],
    ["MIA-STAR", "Mansion en Star Island", "Residencial", "Miami", 18000000, 85000, 14000],
    ["MIA-DT", "Office en Downtown Miami", "Oficina", "Miami", 3200000, 22500, 2800],
    ["MIA-SBH", "Hotel boutique en South Beach", "Hotel", "Miami", 12500000, 98000, 14000],
    ["MAD-SAL", "Piso en Salamanca", "Residencial", "Madrid", 720000, 4200, 600],
    ["MAD-GV", "Local en Gran Via", "Comercial", "Madrid", 1800000, 13500, 1800],
    ["MAD-CAS", "Oficina en Castellana", "Oficina", "Madrid", 2800000, 19500, 2500],
    ["MAD-MOR", "Chalet en La Moraleja", "Residencial", "Madrid", 3500000, 18000, 2800],
    ["LON-MAY", "Flat en Mayfair", "Residencial", "Londres", 4800000, 26000, 3800],
    ["LON-KEN", "Apartment en Kensington", "Residencial", "Londres", 2800000, 15500, 2200],
    ["LON-CW", "Office en Canary Wharf", "Oficina", "Londres", 9500000, 68000, 9000],
    ["TOK-SHI", "Mansion en Shibuya", "Residencial", "Tokio", 1400000, 8500, 1200],
    ["TOK-ROP", "Apartment en Roppongi", "Residencial", "Tokio", 2100000, 12500, 1700],
    ["TOK-SJ", "Tower floor en Shinjuku", "Oficina", "Tokio", 6800000, 48000, 6500],
    ["DXB-PALM", "Villa en Palm Jumeirah", "Residencial", "Dubai", 5800000, 32000, 4800],
    ["DXB-MAR", "Apartment en Marina", "Residencial", "Dubai", 880000, 5500, 700],
    ["DXB-BK", "Penthouse en Burj Khalifa", "Residencial", "Dubai", 18500000, 95000, 14000],
    ["DXB-HOTEL", "Hotel 5 estrellas en Downtown Dubai", "Hotel", "Dubai", 35000000, 260000, 35000],
    ["DXB-MALL", "Mall en Dubai Marina", "Comercial", "Dubai", 48000000, 320000, 42000],
    ["BOG-CHICO", "Apartamento ejecutivo en Chico", "Residencial", "Bogota", 310000, 2100, 330, "Colombia", "Chico"],
    ["BOG-ZF", "Oficina en Zona Franca Bogota", "Oficina", "Bogota", 1250000, 8800, 1150, "Colombia", "Fontibon"],
    ["BOG-ANDINO", "Local comercial en Zona T", "Comercial", "Bogota", 950000, 7200, 900, "Colombia", "Zona T"],
    ["MED-POB", "Apartamento en El Poblado", "Residencial", "Medellin", 240000, 1700, 260, "Colombia", "El Poblado"],
    ["MED-LLAN", "Casa campestre en Llanogrande", "Residencial", "Medellin", 680000, 3900, 620, "Colombia", "Llanogrande"],
    ["CTG-WALL", "Hotel boutique en Ciudad Amurallada", "Hotel", "Cartagena", 2700000, 21000, 4200, "Colombia", "Centro Historico"],
    ["CTG-BCH", "Apartamento turistico en Bocagrande", "Residencial", "Cartagena", 420000, 3200, 520, "Colombia", "Bocagrande"],
    ["CLO-GRA", "Local en Granada Cali", "Comercial", "Cali", 360000, 2600, 360, "Colombia", "Granada"],
    ["CDMX-ROMA", "Departamento en Roma Norte", "Residencial", "Ciudad de Mexico", 360000, 2400, 380, "Mexico", "Roma Norte"],
    ["CDMX-POL", "Oficina boutique en Polanco", "Oficina", "Ciudad de Mexico", 1850000, 13500, 1800, "Mexico", "Polanco"],
    ["SP-JARD", "Apartamento en Jardins", "Residencial", "Sao Paulo", 520000, 3300, 540, "Brasil", "Jardins"],
    ["SP-FARIA", "Oficina en Faria Lima", "Oficina", "Sao Paulo", 3200000, 23500, 3100, "Brasil", "Faria Lima"],
    ["SCL-LAS", "Departamento en Las Condes", "Residencial", "Santiago", 410000, 2500, 390, "Chile", "Las Condes"],
    ["LIM-MIR", "Departamento en Miraflores", "Residencial", "Lima", 280000, 1900, 280, "Peru", "Miraflores"],
    ["PTY-COSTA", "Condo en Costa del Este", "Residencial", "Panama", 520000, 3400, 520, "Panama", "Costa del Este"],
    ["SIN-MB", "Suite corporativa en Marina Bay", "Oficina", "Singapur", 3800000, 27000, 3900, "Singapur", "Marina Bay"]
  ];

  const BUSINESS_ROWS = [
    ["MCD-FR", "McDonald's franquicia", "mcdonalds.com", "food", 1200000, 25000, "franchise"],
    ["SBUX-FR", "Starbucks franquicia", "starbucks.com", "food", 400000, 9500, "franchise"],
    ["SUB-FR", "Subway franquicia", "subway.com", "food", 250000, 5500, "franchise"],
    ["KFC-FR", "KFC franquicia", "kfc.com", "food", 850000, 18000, "franchise"],
    ["DOM-FR", "Domino's Pizza franquicia", "dominos.com", "food", 350000, 7800, "franchise"],
    ["BK-FR", "Burger King franquicia", "bk.com", "food", 750000, 14500, "franchise"],
    ["DNKN-FR", "Dunkin franquicia", "dunkindonuts.com", "food", 300000, 6500, "franchise"],
    ["SEV-FR", "7-Eleven franquicia", "7-eleven.com", "retail", 180000, 4800, "franchise"],
    ["HTZ-FR", "Hertz Rent-a-Car franquicia", "hertz.com", "services", 1500000, 22000, "franchise"],
    ["AF-FR", "Anytime Fitness franquicia", "anytimefitness.com", "services", 350000, 6500, "franchise"],
    ["HRB-FR", "H&R Block franquicia", "hrblock.com", "services", 90000, 3200, "franchise"],
    ["CB-FR", "Coldwell Banker franquicia", "coldwellbanker.com", "real_estate", 250000, 8500, "franchise"],
    ["REMAX-FR", "RE/MAX franquicia", "remax.com", "real_estate", 180000, 7200, "franchise"],
    ["UPS-FR", "UPS Store franquicia", "theupsstore.com", "logistics", 230000, 4500, "franchise"],
    ["LOCALLOG", "LocalLogistics LLC", "", "logistics", 480000, 9500, "acquisition"],
    ["MIDCONST", "MidMarket Construction", "", "construction", 2400000, 42000, "acquisition"],
    ["TECHAG", "TechAgency Studio", "", "software", 1200000, 28000, "acquisition"],
    ["BHH", "BoutiqueHotel Holdings", "", "hospitality", 5800000, 85000, "acquisition"],
    ["REGSUP", "RegionalSupermarket", "", "retail", 14500000, 210000, "acquisition"],
    ["CLOUDMID", "CloudHosting Mid Co", "", "software", 8500000, 145000, "acquisition"],
    ["MEDIALOC", "MediaLocal Network", "", "media", 3200000, 52000, "acquisition"],
    ["FOODDEL", "FoodDelivery Regional", "", "logistics", 18000000, 260000, "acquisition"],
    ["MIDBANK", "MidBank Holding", "", "banking", 48000000, 720000, "acquisition"],
    ["ENERMID", "EnergyMid Corp", "", "energy", 24000000, 380000, "acquisition"],
    ["LOGMEGA", "LogisticsMega Co", "", "logistics", 85000000, 1250000, "acquisition"]
  ];

  const COMMODITY_ROWS = [
    ["GOLD", "Oro", "XAU", 2650, "oz", 1.0, "precious_metals"],
    ["SILVER", "Plata", "XAG", 32, "oz", 1.4, "precious_metals"],
    ["WTI", "Petroleo WTI", "CL", 78, "bbl", 1.6, "energy_commodities"],
    ["BRENT", "Petroleo Brent", "BZ", 82, "bbl", 1.5, "energy_commodities"],
    ["NATGAS", "Gas Natural Henry Hub", "NG", 3.2, "MMBtu", 2.0, "energy_commodities"],
    ["WHEAT", "Trigo Chicago", "ZW", 580, "bushel", 1.3, "agriculture"],
    ["CORN", "Maiz Chicago", "ZC", 440, "bushel", 1.3, "agriculture"],
    ["SOY", "Soja Chicago", "ZS", 1140, "bushel", 1.3, "agriculture"],
    ["COPPER", "Cobre LME", "HG", 4.2, "lb", 1.4, "industrial_metals"],
    ["LITHIUM", "Litio Carbonato", "LITH", 14500, "t", 1.8, "industrial_metals"],
    ["URANIUM", "Uranio", "UX", 85, "lb", 1.7, "energy_commodities"],
    ["PLATINUM", "Platino", "XPT", 980, "oz", 1.2, "precious_metals"]
  ];

  const CRYPTO_ROWS = [
    ["BTC", "Bitcoin", "bitcoin.org", 68000, 2.5, 0],
    ["ETH", "Ethereum", "ethereum.org", 3400, 2.8, 0.04],
    ["SOL", "Solana", "solana.com", 185, 3.5, 0.065],
    ["XRP", "Ripple", "ripple.com", 0.62, 2.5, 0],
    ["ADA", "Cardano", "cardano.org", 0.48, 3.2, 0.05],
    ["DOT", "Polkadot", "polkadot.network", 7.1, 3.0, 0.12],
    ["AVAX", "Avalanche", "avax.network", 42, 3.6, 0.07],
    ["MATIC", "Polygon", "polygon.technology", 0.74, 3.4, 0.045],
    ["LINK", "Chainlink", "chain.link", 18, 3.2, 0],
    ["DOGE", "Dogecoin", "dogecoin.com", 0.18, 4.5, 0],
    ["SHIB", "Shiba Inu", "shibatoken.com", 0.00002, 5.0, 0],
    ["USDC", "USD Coin", "circle.com", 1, 0.05, 0.05]
  ];

  const COLLECTIBLE_ROWS = [
    ["SMUNDI", "Salvator Mundi estilo Da Vinci", "Arte", 145000000, 0.6, 0.2],
    ["PICASSO", "Pintura de Picasso mediana", "Arte", 2800000, 0.8, 0.4],
    ["BANKSY", "Banksy street art canvas", "Arte", 1800000, 1.5, 0.5],
    ["WARHOL", "Warhol Marilyn Series", "Arte", 4500000, 0.9, 0.4],
    ["RDC90", "Romanee-Conti 1990 cellar", "Vino", 35000, 0.7, 0.6],
    ["LAF82", "Chateau Lafite Rothschild 1982", "Vino", 58000, 0.6, 0.6],
    ["F250GTO", "Ferrari 250 GTO 1962", "Auto clasico", 48000000, 0.5, 0.3],
    ["P911RS", "Porsche 911 Carrera RS 1973", "Auto clasico", 1200000, 0.8, 0.6],
    ["MIURA", "Lamborghini Miura SV", "Auto clasico", 2400000, 0.7, 0.5],
    ["DB5", "Aston Martin DB5 estilo 007", "Auto clasico", 3800000, 0.7, 0.5],
    ["BAYC", "Bored Ape NFT rare", "NFT", 250000, 3.0, 0.7],
    ["PUNKALIEN", "CryptoPunk Alien", "NFT", 4500000, 2.5, 0.6],
    ["PP5711", "Patek Philippe Nautilus 5711", "Reloj", 180000, 1.0, 0.7],
    ["ROLEXPN", "Rolex Daytona Paul Newman", "Reloj", 480000, 0.9, 0.7],
    ["APROAK", "Audemars Piguet Royal Oak", "Reloj", 145000, 0.9, 0.7],
    ["RM1103", "Richard Mille RM 11-03", "Reloj", 290000, 1.0, 0.6],
    ["STRAD", "Stradivarius violin antiguo", "Instrumento", 4500000, 0.4, 0.2],
    ["CHARIZARD", "Pokemon Charizard 1st Ed BGS 10", "Coleccionable", 420000, 1.5, 0.6],
    ["MANUSCRIPT", "Manuscrito historico autenticado", "Historico", 850000, 0.4, 0.3],
    ["AJ1985", "Air Jordan 1 Original 1985 raro", "Sneakers", 25000, 1.4, 0.6]
  ];

  const ASSET_CATALOG = [
    ...STOCK_ROWS.map(createStock),
    ...BOND_ROWS.map(createBond),
    ...PROPERTY_ROWS.map(createProperty),
    ...BUSINESS_ROWS.map(createBusiness),
    ...COMMODITY_ROWS.map(createCommodity),
    ...CRYPTO_ROWS.map(createCrypto),
    ...COLLECTIBLE_ROWS.map(createCollectible)
  ];

  function createSector(label, beta, volatility, phaseValues) {
    return {
      label,
      beta,
      volatility,
      phaseBias: {
        expansion: phaseValues[0],
        peak: phaseValues[1],
        recession: phaseValues[2],
        recovery: phaseValues[3]
      }
    };
  }

  function sanitizeId(value) {
    return String(value)
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  function seededAsset(base) {
    return {
      logoDomain: null,
      logoUrl: null,
      seedCurrency: "USD",
      seedDate: SEED_DATE,
      seedSource: SEED_SOURCE,
      ...base
    };
  }

  function createStock(row, index) {
    const [ticker, name, logoDomain, seedPrice, volatility, beta, dividendYield, sector] = row;
    return seededAsset({
      id: `stock_${sanitizeId(ticker)}`,
      type: "stock",
      name,
      ticker,
      sector,
      logoDomain,
      seedPrice,
      volatility,
      beta,
      liquidity: 0.78 + Math.max(0, 1.8 - volatility) * 0.08,
      driftAnnual: 0.045 + Math.max(0, beta) * 0.022,
      dividendYield,
      baseDailyVolume: Math.round((48 - index) * 1200000 + seedPrice * 26000)
    });
  }

  function createBond(row) {
    const [ticker, name, logoDomain, couponYield, termDays, rating, nominal, sector] = row;
    const riskPenalty = rating.includes("CCC") ? 0.28 : rating.includes("BB") ? 0.14 : 0;
    return seededAsset({
      id: `bond_${sanitizeId(ticker)}`,
      type: "bond",
      name,
      ticker,
      sector,
      logoDomain,
      seedPrice: nominal,
      volatility: sector === "sovereign_bonds" ? 0.28 + riskPenalty : 0.42 + riskPenalty,
      beta: sector === "sovereign_bonds" ? -0.2 + riskPenalty : 0.34 + riskPenalty,
      liquidity: sector === "sovereign_bonds" ? 0.92 - riskPenalty : 0.68 - riskPenalty * 0.6,
      driftAnnual: couponYield * 0.72,
      couponYield,
      termDays,
      rating,
      durationYears: termDays / 365 * 0.82,
      baseDailyVolume: sector === "sovereign_bonds" ? 9000000 : 850000
    });
  }

  function createProperty(row) {
    const [ticker, name, propertyKind, city, seedPrice, monthlyRent, monthlyMaintenance, countryValue, neighborhoodValue] = row;
    const cityMeta = PROPERTY_CITY_META[city] || {};
    const country = countryValue || cityMeta.country || null;
    const region = cityMeta.region || country || "Internacional";
    const neighborhood = neighborhoodValue || null;
    return seededAsset({
      id: `realestate_${sanitizeId(ticker)}`,
      type: "real_estate",
      name,
      ticker,
      sector: "real_estate",
      propertyKind,
      city,
      country,
      region,
      neighborhood,
      seedPrice,
      volatility: propertyKind === "Hotel" ? 0.52 : propertyKind === "Comercial" ? 0.45 : 0.36,
      beta: city === "Nueva York" || city === "Dubai" || city === "Singapur" ? 0.62 : country === "Colombia" ? 0.48 : 0.52,
      liquidity: seedPrice > 10000000 ? 0.12 : seedPrice > 2000000 ? 0.18 : 0.24,
      driftAnnual: 0.036 + monthlyRent * 12 / seedPrice * 0.28,
      monthlyRent,
      monthlyMaintenance,
      baseDailyVolume: Math.max(1, Math.round(2200000 / Math.max(seedPrice, 1)))
    });
  }

  function createBusiness(row) {
    const [ticker, name, logoDomain, sector, seedPrice, monthlyProfit, acquisitionType] = row;
    return seededAsset({
      id: `business_${sanitizeId(ticker)}`,
      type: "business",
      name,
      ticker,
      sector,
      logoDomain: logoDomain || null,
      seedPrice,
      volatility: acquisitionType === "franchise" ? 0.7 : 0.95,
      beta: acquisitionType === "franchise" ? 0.76 : 1.02,
      liquidity: acquisitionType === "franchise" ? 0.22 : 0.16,
      driftAnnual: 0.025 + monthlyProfit * 12 / seedPrice * 0.2,
      monthlyProfit,
      acquisitionType,
      baseDailyVolume: seedPrice > 10000000 ? 1 : 3
    });
  }

  function createCommodity(row) {
    const [ticker, name, symbol, seedPrice, unit, volatility, sector] = row;
    return seededAsset({
      id: `commodity_${sanitizeId(ticker)}`,
      type: "commodity",
      name,
      ticker: symbol,
      sector,
      seedPrice,
      volatility,
      beta: sector === "precious_metals" ? -0.22 : 0.72,
      liquidity: 0.72 + Math.max(0, 2 - volatility) * 0.06,
      driftAnnual: sector === "precious_metals" ? 0.025 : 0.018,
      unit,
      baseDailyVolume: Math.round(120000 + seedPrice * 900)
    });
  }

  function createCrypto(row) {
    const [ticker, name, logoDomain, seedPrice, volatility, stakingYield] = row;
    const isStablecoin = ticker === "USDC";
    const isSpeculative = !isStablecoin && (seedPrice < 0.05 || volatility >= 4.5);
    return seededAsset({
      id: `crypto_${sanitizeId(ticker)}`,
      type: "crypto",
      name,
      ticker,
      sector: "crypto",
      logoDomain,
      seedPrice,
      volatility,
      priceAnchor: seedPrice,
      isStablecoin,
      isSpeculative,
      momentumCap: isStablecoin ? 1.03 : (seedPrice < 0.01 ? 8 : 14),
      beta: isStablecoin ? 0.01 : isSpeculative ? 1.18 + volatility * 0.04 : 1.4 + volatility * 0.06,
      liquidity: isStablecoin ? 0.99 : isSpeculative ? 0.38 + Math.max(0, 5 - volatility) * 0.04 : 0.58 + Math.max(0, 5 - volatility) * 0.07,
      driftAnnual: isStablecoin ? 0.001 : isSpeculative ? 0.004 + Math.min(volatility, 4) * 0.002 : 0.008 + Math.min(volatility, 4) * 0.005,
      stakingYield,
      baseDailyVolume: isStablecoin ? 5200000 : ticker === "BTC" ? 340000 : ticker === "ETH" ? 2200000 : isSpeculative ? 420000 : 800000
    });
  }

  function createCollectible(row) {
    const [ticker, name, collectibleKind, seedPrice, volatility, liquidity] = row;
    return seededAsset({
      id: `collectible_${sanitizeId(ticker)}`,
      type: "collectible",
      name,
      ticker,
      sector: "collectibles",
      collectibleKind,
      seedPrice,
      volatility,
      beta: 0.18,
      liquidity,
      driftAnnual: 0.026 + Math.max(0, 1.5 - volatility) * 0.018,
      baseDailyVolume: seedPrice > 1000000 ? 1 : 2
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getCatalog() {
    return clone(ASSET_CATALOG);
  }

  function getAssetById(id) {
    const asset = ASSET_CATALOG.find((item) => item.id === id);
    return asset ? clone(asset) : null;
  }

  function getSectorConfig(sector) {
    return clone(SECTOR_CONFIG[sector] || SECTOR_CONFIG.discretionary);
  }

  function getCategoryLabel(type) {
    return CATEGORY_LABELS[type] || "Activo";
  }

  function getCatalogCounts() {
    return ASSET_CATALOG.reduce((counts, asset) => {
      counts[asset.type] = (counts[asset.type] || 0) + 1;
      counts.total += 1;
      return counts;
    }, { total: 0 });
  }

  window.CashEmpireData = {
    SEED_DATE,
    SEED_SOURCE,
    CATEGORY_LABELS: clone(CATEGORY_LABELS),
    SECTOR_CONFIG: clone(SECTOR_CONFIG),
    getCatalog,
    getAssetById,
    getSectorConfig,
    getCategoryLabel,
    getCatalogCounts
  };
})();
