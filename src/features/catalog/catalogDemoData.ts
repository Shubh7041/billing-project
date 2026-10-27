import type { Category, Product } from "./catalogTypes";

export const demoCategories: Category[] = [
  {
    id: "category-sparklers",
    name: "Sparklers",
    description: "Handheld sparkler varieties.",
    isActive: true,
  },
  {
    id: "category-ground",
    name: "Ground Items",
    description: "Fountains, chakras, and other ground effects.",
    isActive: true,
  },
  {
    id: "category-rockets",
    name: "Rockets",
    description: "Aerial rocket products.",
    isActive: true,
  },
];

export const demoProducts: Product[] = [
  {
    id: "product-sparkler-10",
    name: "Sparklers 10 cm",
    sku: "SPK-010",
    description: "Standard 10 cm sparkler.",
    categoryId: "category-sparklers",
    baseUnitCode: "piece",
    isActive: true,
    units: [
      {
        id: "unit-sparkler-piece",
        unitName: "Piece",
        unitCode: "piece",
        baseQuantity: "1",
        isBaseUnit: true,
        isSellable: true,
        isPurchasable: true,
        sellingPrice: "8.00",
      },
      {
        id: "unit-sparkler-box",
        unitName: "Box",
        unitCode: "box",
        baseQuantity: "100",
        isBaseUnit: false,
        isSellable: true,
        isPurchasable: true,
        sellingPrice: "650.00",
      },
    ],
  },
  {
    id: "product-flower-pot",
    name: "Flower Pots Medium",
    sku: "GND-204",
    description: "Medium fountain-style ground item.",
    categoryId: "category-ground",
    baseUnitCode: "packet",
    isActive: true,
    units: [
      {
        id: "unit-flower-packet",
        unitName: "Packet",
        unitCode: "packet",
        baseQuantity: "1",
        isBaseUnit: true,
        isSellable: true,
        isPurchasable: true,
        sellingPrice: "180.00",
      },
      {
        id: "unit-flower-carton",
        unitName: "Carton",
        unitCode: "carton",
        baseQuantity: "12",
        isBaseUnit: false,
        isSellable: true,
        isPurchasable: true,
        sellingPrice: "1980.00",
      },
    ],
  },
  {
    id: "product-rocket",
    name: "Sky Rocket Assortment",
    sku: "RKT-031",
    description: "Assorted rockets sold by pack.",
    categoryId: "category-rockets",
    baseUnitCode: "pack",
    isActive: true,
    units: [
      {
        id: "unit-rocket-pack",
        unitName: "Pack",
        unitCode: "pack",
        baseQuantity: "1",
        isBaseUnit: true,
        isSellable: true,
        isPurchasable: true,
        sellingPrice: "420.00",
      },
    ],
  },
];