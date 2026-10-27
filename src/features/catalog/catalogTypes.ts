export interface Category {
  id: string
  name: string
  description: string
  isActive: boolean
}

export interface ProductUnit {
  id: string
  unitName: string
  unitCode: string
  baseQuantity: string
  isBaseUnit: boolean
  isSellable: boolean
  isPurchasable: boolean
  sellingPrice: string
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string
  categoryId: string | null
  baseUnitCode: string
  isActive: boolean
  units: ProductUnit[]
}

export interface CategoryInput {
  name: string
  description: string
  isActive: boolean
}

export interface ProductInput {
  name: string
  sku: string
  description: string
  categoryId: string | null
  isActive: boolean
  units: ProductUnit[]
}