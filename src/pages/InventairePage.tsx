import { useEffect, useState, useMemo } from "react";
import { Search, Edit2, Trash2, X, Save, Eye, Layers, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getProducts, updateProduct, deleteProduct, getCategories, getCustomCards } from "@/lib/db";
import { Product, Category, CustomSaleCard } from "@/lib/types";
import { formatDZD } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";

const SHIRT_SIZES = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["39", "40", "41", "42", "43", "44", "45"];

export default function InventairePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [customCards, setCustomCards] = useState<CustomSaleCard[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, cats, cards] = await Promise.all([getProducts(), getCategories(), getCustomCards()]);
        setProducts(prods);
        setDbCategories(cats);
        setCustomCards(cards || []);
      } catch (error) {
        console.error("Error loading inventory:", error);
      }
    };
    loadData();
  }, []);

  const dispatchInventoryUpdate = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("novaInventoryUpdated"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      dispatchInventoryUpdate();
      toast.success("Produit supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setShowEditModal(true);
  };

  const handleShowDetails = (product: Product) => {
    setSelectedDetailProduct(product);
    setShowDetailModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await updateProduct(editingProduct);
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? editingProduct : p));
      dispatchInventoryUpdate();
      setShowEditModal(false);
      setEditingProduct(null);
      toast.success("Produit mis à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || p.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, catFilter]);

  const { totalBuy, totalSale } = useMemo(() => {
    return products.reduce(
      (acc, p) => {
        const qty = p.stock || 0;
        acc.totalBuy += (p.priceBuy || 0) * qty;
        acc.totalSale += (p.priceSale || 0) * qty;
        return acc;
      },
      { totalBuy: 0, totalSale: 0 }
    );
  }, [products]);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#eef5f4] px-4 pb-6 pt-5 text-gray-800">
        <div className="mx-auto max-w-md space-y-5">
          <div className="rounded-[2rem] bg-[#243740] px-5 py-5 text-white shadow-[0_18px_40px_rgba(36,55,64,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">Inventaire</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black tracking-tight">Stock mobile</h2>
                <p className="mt-1 text-sm text-white/70">{filtered.length} produit{filtered.length !== 1 ? "s" : ""} visible{filtered.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/50">Alertes</p>
                <p className="text-lg font-black">{filtered.filter(product => product.stock <= 5).length}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] uppercase font-bold tracking-wider text-white/60">Total Prix d'Achat</p>
                <p className="mt-1 text-xl font-black text-amber-300">{formatDZD(totalBuy)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[11px] uppercase font-bold tracking-wider text-white/60">Total Prix de Vente</p>
                <p className="mt-1 text-xl font-black text-emerald-300">{formatDZD(totalSale)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Rechercher un produit..."
                className="h-12 rounded-2xl border-gray-200 bg-[#f7fbfa] pl-11 text-sm font-medium shadow-none focus-visible:ring-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="mobile-scroll-x mt-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCatFilter("")}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${!catFilter ? "bg-[#41b86d] text-white" : "bg-[#eef5f4] text-[#3f5362]"}`}
              >
                Toutes
              </button>
              {dbCategories.map(category => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setCatFilter(category.key)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors ${catFilter === category.key ? "bg-[#243740] text-white" : "bg-[#eef5f4] text-[#3f5362]"}`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-[#c9dcda] bg-white px-4 py-10 text-center text-sm font-medium text-gray-400">
                Aucun produit ne correspond aux filtres.
              </div>
            ) : (
              filtered.map(product => {
                const category = dbCategories.find(item => item.key === product.category);
                return (
                  <article
                    key={product.id}
                    onClick={() => handleShowDetails(product)}
                    className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6] cursor-pointer hover:ring-primary/50 transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-base font-black leading-tight text-[#243740] flex items-center gap-1.5">
                          {product.name}
                          <Eye className="h-3.5 w-3.5 text-primary opacity-60 inline-block" />
                        </p>
                        <div className="mt-2 inline-flex rounded-full bg-[#eef5f4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#628b9a]">
                          {category?.label}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className={`rounded-2xl px-3 py-2 text-center ${product.stock <= 5 ? "bg-red-50 text-red-500" : "bg-[#ecf8f0] text-[#41b86d]"}`}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Stock</p>
                          <p className="text-lg font-black">{product.stock}</p>
                        </div>
                        <div className="flex gap-1 justify-center" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleEdit(product)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 active:bg-red-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f7fbfa] px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Prix d'achat</p>
                        <p className="mt-1 text-sm font-bold text-gray-600">{formatDZD(product.priceBuy)}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7fbfa] px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Prix vente</p>
                        <p className="mt-1 text-sm font-black text-[#41b86d]">{formatDZD(product.priceSale)}</p>
                      </div>
                    </div>

                    {product.barcode && (
                      <div className="mt-3 rounded-2xl bg-[#f7fbfa] px-3 py-3 flex justify-between items-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Code-barre</p>
                        <p className="text-[10px] font-mono font-bold text-slate-500">{product.barcode}</p>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Product Details Modal for Mobile */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
            {selectedDetailProduct && (() => {
              const category = dbCategories.find(c => c.key === selectedDetailProduct.category);
              const isShoe = category?.hasPointure;
              const isClothing = category?.hasTailles;
              const hasSizeFeature = isShoe || isClothing || (selectedDetailProduct.sizeStock && Object.keys(selectedDetailProduct.sizeStock).length > 0);
              const isCustomizable = category?.hasVentePersonnalisee;
              const productCustomCards = customCards.filter(c => c.baseProductId === selectedDetailProduct.id);

              const sizeEntries = selectedDetailProduct.sizeStock ? Object.entries(selectedDetailProduct.sizeStock) : [];
              const defaultSizes = isShoe ? SHOE_SIZES : isClothing ? SHIRT_SIZES : [];
              const allDisplaySizes = Array.from(new Set([...sizeEntries.map(([s]) => s), ...defaultSizes]));

              return (
                <div className="flex flex-col">
                  <DialogHeader className="p-6 bg-[#243740] text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#628b9a] bg-[#eef5f4] px-3 py-1 rounded-full">
                          {category?.label || selectedDetailProduct.category}
                        </span>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight mt-2 text-white">
                          {selectedDetailProduct.name}
                        </DialogTitle>
                        {selectedDetailProduct.barcode && (
                          <p className="text-xs font-mono font-bold text-white/70 mt-1">
                            Code-barre: {selectedDetailProduct.barcode}
                          </p>
                        )}
                      </div>
                      <div className={`px-4 py-2 rounded-2xl text-center shrink-0 ${selectedDetailProduct.stock <= 5 ? "bg-red-500/20 border border-red-400/30 text-red-200" : "bg-[#41b86d]/20 border border-[#41b86d]/40 text-emerald-200"}`}>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-80">Stock</p>
                        <p className="text-2xl font-black">{selectedDetailProduct.stock}</p>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto bg-[#f4f8f8]">
                    {hasSizeFeature && (
                      <div className="bg-white p-5 rounded-[1.75rem] border border-[#dce8e6] shadow-sm space-y-3">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-[#41b86d]" />
                          <h3 className="text-sm font-black text-[#243740] uppercase tracking-wider">
                            Détails des {isShoe ? "Pointures" : "Tailles"}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          {allDisplaySizes.map(size => {
                            const qty = selectedDetailProduct.sizeStock?.[size] || 0;
                            const inStock = qty > 0;
                            return (
                              <div
                                key={size}
                                className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center ${
                                  inStock ? "bg-[#ecf8f0] border-[#b2e2c4] text-[#243740]" : "bg-red-50/50 border-red-100 text-gray-400"
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase text-[#628b9a]">{isShoe ? `Pointure` : `Taille`}</span>
                                <span className="text-lg font-black text-[#243740]">{size}</span>
                                <span className={`text-[10px] font-black mt-1 px-2.5 py-0.5 rounded-full ${inStock ? "bg-[#41b86d] text-white" : "bg-red-100 text-red-600"}`}>
                                  {inStock ? `${qty} en stock` : "Épuisé"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {(isCustomizable || productCustomCards.length > 0) && (
                      <div className="bg-white p-5 rounded-[1.75rem] border border-[#dce8e6] shadow-sm space-y-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-5 w-5 text-[#41b86d]" />
                          <h3 className="text-sm font-black text-[#243740] uppercase tracking-wider">
                            Ventes Personnalisées
                          </h3>
                        </div>
                        {productCustomCards.length === 0 ? (
                          <p className="text-xs font-medium text-gray-400 italic">Aucune carte active.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2">
                            {productCustomCards.map(card => (
                              <div key={card.id} className="p-3 rounded-2xl bg-[#f7fbfa] border border-[#dce8e6] flex justify-between items-center">
                                <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Restant</p>
                                  <p className="text-base font-black text-[#243740]">{card.kg} kg/unités</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">Prix Unitaire</p>
                                  <p className="text-base font-black text-[#41b86d]">{formatDZD(card.unitPrice)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="p-5 bg-white border-t border-gray-100 flex justify-end gap-2">
                    <Button
                      onClick={() => setShowDetailModal(false)}
                      className="h-11 rounded-2xl px-6 font-black uppercase text-xs tracking-widest bg-[#243740] text-white"
                    >
                      Fermer
                    </Button>
                  </DialogFooter>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="mb-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black tracking-tight text-[#3f5362]">Inventaire</h2>
          <p className="mt-2 text-gray-500 font-medium">Valeur globale et gestion de l'état des stocks</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md flex flex-col justify-center min-w-[280px]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Total Prix d'Achat</p>
            <p className="text-3xl lg:text-4xl font-black text-[#243740] mt-1">{formatDZD(totalBuy)}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-md flex flex-col justify-center min-w-[280px]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Total Prix de Vente</p>
            <p className="text-3xl lg:text-4xl font-black text-[#41b86d] mt-1">{formatDZD(totalSale)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 mb-8">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400" />
          <Input placeholder="Rechercher un produit..." className="pl-16 bg-white border-gray-200 h-16 shadow-sm rounded-2xl focus-visible:ring-0 text-lg font-bold" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-6 py-2 h-16 bg-white rounded-2xl shadow-sm border border-gray-200 text-lg font-black text-gray-600 focus:outline-none min-w-[240px]" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          {dbCategories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Produit</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Catégorie</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Stock Total</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Prix d'achat</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Prix de vente</th>
              <th className="text-right px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cat = dbCategories.find(c => c.key === p.category);
              const hasSizes = (cat?.hasPointure || cat?.hasTailles) || (p.sizeStock && Object.keys(p.sizeStock).length > 0);
              const hasCustom = cat?.hasVentePersonnalisee || customCards.some(c => c.baseProductId === p.id);

              return (
                <tr
                  key={p.id}
                  onClick={() => handleShowDetails(p)}
                  className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/60 transition-colors group cursor-pointer"
                >
                  <td className="px-8 py-6 flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-gray-700 text-lg group-hover:text-primary transition-colors">{p.name}</span>
                      <Eye className="h-4 w-4 text-gray-300 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.barcode && <span className="text-[10px] font-mono text-gray-400 font-bold tracking-wider">{p.barcode}</span>}
                      {hasSizes && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#eef5f4] text-[#628b9a]">
                          {cat?.hasPointure ? "Pointures" : "Tailles"}
                        </span>
                      )}
                      {hasCustom && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#ecf8f0] text-[#41b86d]">
                          Vente Personnalisée
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-gray-500 text-center">
                    <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-black uppercase tracking-widest">{cat?.label || p.category}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-2 rounded-xl text-xl font-black ${p.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100/50 text-green-700'}`}>{p.stock}</span>
                  </td>
                  <td className="px-8 py-6 text-center font-bold text-xl text-gray-600">{formatDZD(p.priceBuy)}</td>
                  <td className="px-8 py-6 text-center font-black text-2xl text-primary">{formatDZD(p.priceSale)}</td>
                  <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} className="h-10 w-10 p-0 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all" title="Modifier">
                        <Edit2 className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-10 w-10 p-0 rounded-xl bg-red-50 text-red-300 hover:text-red-600 hover:bg-red-100 transition-all" title="Supprimer">
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-xl font-bold uppercase tracking-widest">Aucun produit trouvé</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-[#243740] text-white">
            <DialogTitle className="text-3xl font-black uppercase tracking-tight">Modifier Produit</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="p-8 space-y-8 bg-white">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3 col-span-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#628b9a] ml-1">Désignation</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-lg px-6"
                    placeholder="Nom du produit"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#628b9a] ml-1">Catégorie</Label>
                  <Select value={editingProduct.category} onValueChange={v => setEditingProduct({ ...editingProduct, category: v })}>
                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-lg px-6">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">
                      {dbCategories.map(cat => (
                        <SelectItem key={cat.key} value={cat.key} className="py-3 font-bold">{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#628b9a] ml-1">Code-barre</Label>
                  <Input
                    value={editingProduct.barcode || ""}
                    onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-lg px-6"
                    placeholder="0000000000"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#628b9a] ml-1">Stock actuel</Label>
                  <Input
                    type="number"
                    value={editingProduct.stock}
                    onChange={e => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-black text-xl px-6 text-primary"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#628b9a] ml-1">Unité</Label>
                  <Select value={editingProduct.unit} onValueChange={(v: "unité" | "kg") => setEditingProduct({ ...editingProduct, unit: v })}>
                    <SelectTrigger className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-lg px-6">
                      <SelectValue placeholder="Unité" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2">
                      <SelectItem value="unité" className="py-3 font-bold">Unité</SelectItem>
                      <SelectItem value="kg" className="py-3 font-bold">Kilogramme (kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#628b9a] ml-1">Prix d'Achat (DZD)</Label>
                  <Input
                    type="number"
                    value={editingProduct.priceBuy}
                    onChange={e => setEditingProduct({ ...editingProduct, priceBuy: Number(e.target.value) })}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-bold text-lg px-6"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs font-black uppercase tracking-widest text-[#628b9a] ml-1">Prix de Vente (DZD)</Label>
                  <Input
                    type="number"
                    value={editingProduct.priceSale}
                    onChange={e => setEditingProduct({ ...editingProduct, priceSale: Number(e.target.value) })}
                    className="h-14 rounded-2xl border-slate-200 bg-slate-50 font-black text-xl px-6 text-[#41b86d]"
                  />
                </div>
              </div>

              <DialogFooter className="pt-6 border-t flex gap-3">
                <Button variant="ghost" onClick={() => setShowEditModal(false)} className="h-14 rounded-2xl px-8 font-black text-slate-400 uppercase text-xs tracking-widest">Annuler</Button>
                <Button onClick={handleSaveEdit} className="h-14 rounded-2xl px-10 font-black uppercase text-xs tracking-widest bg-[#41b86d] hover:bg-[#329a59] text-white shadow-lg shadow-green-100 transition-all hover:-translate-y-1 gap-2">
                  <Save className="h-4 w-4" /> Enregistrer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Desktop Product Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-2xl bg-white border-0 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden">
          {selectedDetailProduct && (() => {
            const category = dbCategories.find(c => c.key === selectedDetailProduct.category);
            const isShoe = category?.hasPointure;
            const isClothing = category?.hasTailles;
            const hasSizeFeature = isShoe || isClothing || (selectedDetailProduct.sizeStock && Object.keys(selectedDetailProduct.sizeStock).length > 0);
            const isCustomizable = category?.hasVentePersonnalisee;
            const productCustomCards = customCards.filter(c => c.baseProductId === selectedDetailProduct.id);

            const sizeEntries = selectedDetailProduct.sizeStock ? Object.entries(selectedDetailProduct.sizeStock) : [];
            const defaultSizes = isShoe ? SHOE_SIZES : isClothing ? SHIRT_SIZES : [];
            const allDisplaySizes = Array.from(new Set([...sizeEntries.map(([s]) => s), ...defaultSizes]));

            return (
              <div className="flex flex-col">
                <DialogHeader className="p-8 bg-[#243740] text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#628b9a] bg-[#eef5f4] px-3 py-1.5 rounded-full">
                        {category?.label || selectedDetailProduct.category}
                      </span>
                      <DialogTitle className="text-3xl font-black uppercase tracking-tight mt-3 text-white">
                        {selectedDetailProduct.name}
                      </DialogTitle>
                      {selectedDetailProduct.barcode && (
                        <p className="text-xs font-mono font-bold text-white/70 mt-1 tracking-wider">
                          Code-barre: {selectedDetailProduct.barcode}
                        </p>
                      )}
                    </div>
                    <div className={`px-5 py-3 rounded-2xl text-center shrink-0 ${selectedDetailProduct.stock <= 5 ? "bg-red-500/20 border border-red-400/30 text-red-200" : "bg-[#41b86d]/20 border border-[#41b86d]/40 text-emerald-200"}`}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Stock Total</p>
                      <p className="text-3xl font-black">{selectedDetailProduct.stock} <span className="text-xs font-normal">{selectedDetailProduct.unit || "unité"}</span></p>
                    </div>
                  </div>
                </DialogHeader>

                <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto bg-[#f4f8f8]">
                  {/* SIZES / POINTURES BREAKDOWN */}
                  {hasSizeFeature && (
                    <div className="bg-white p-6 rounded-[1.75rem] border border-[#dce8e6] shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-[#41b86d]" />
                          <h3 className="text-base font-black text-[#243740] uppercase tracking-wider">
                            Détails des {isShoe ? "Pointures" : "Tailles"}
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-[#628b9a] uppercase tracking-widest">
                          {allDisplaySizes.filter(s => (selectedDetailProduct.sizeStock?.[s] || 0) > 0).length} disponible(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                        {allDisplaySizes.map(size => {
                          const qty = selectedDetailProduct.sizeStock?.[size] || 0;
                          const inStock = qty > 0;
                          return (
                            <div
                              key={size}
                              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                                inStock
                                  ? "bg-[#ecf8f0] border-[#b2e2c4] text-[#243740]"
                                  : "bg-red-50/50 border-red-100 text-gray-400"
                              }`}
                            >
                              <span className="text-xs font-bold uppercase text-[#628b9a] mb-0.5">{isShoe ? `Pointure` : `Taille`}</span>
                              <span className="text-xl font-black text-[#243740] tracking-tight">{size}</span>
                              <span className={`text-[11px] font-black mt-1 px-2.5 py-0.5 rounded-full ${inStock ? "bg-[#41b86d] text-white" : "bg-red-100 text-red-600"}`}>
                                {inStock ? `${qty} en stock` : "Épuisé"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* VENTE PERSONNALISÉE CARDS */}
                  {(isCustomizable || productCustomCards.length > 0) && (
                    <div className="bg-white p-6 rounded-[1.75rem] border border-[#dce8e6] shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-[#41b86d]" />
                        <h3 className="text-base font-black text-[#243740] uppercase tracking-wider">
                          Ventes Personnalisées
                        </h3>
                      </div>
                      {productCustomCards.length === 0 ? (
                        <p className="text-xs font-medium text-gray-400 italic">
                          Aucune carte de vente personnalisée active pour ce produit.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {productCustomCards.map(card => (
                            <div key={card.id} className="p-4 rounded-2xl bg-[#f7fbfa] border border-[#dce8e6] flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Quantité Restante</p>
                                <p className="text-xl font-black text-[#243740]">{card.kg} <span className="text-xs font-normal">unités/kg</span></p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-gray-400 uppercase">Prix Unitaire</p>
                                <p className="text-lg font-black text-[#41b86d]">{formatDZD(card.unitPrice)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter className="p-6 bg-white border-t border-gray-100 flex justify-between items-center gap-3">
                  <Button
                    onClick={() => {
                      setShowDetailModal(false);
                      handleEdit(selectedDetailProduct);
                    }}
                    className="h-12 rounded-2xl px-8 font-black uppercase text-xs tracking-widest bg-[#41b86d] hover:bg-[#329a59] text-white shadow-lg shadow-green-100 transition-all hover:-translate-y-0.5 gap-2"
                  >
                    <Edit2 className="h-4 w-4" /> Modifier le Produit
                  </Button>
                  <Button
                    onClick={() => setShowDetailModal(false)}
                    className="h-12 rounded-2xl px-8 font-black uppercase text-xs tracking-widest bg-[#243740] hover:bg-[#1a282f] text-white shadow-md"
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
