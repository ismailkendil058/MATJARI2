import { useEffect, useState, useMemo } from "react";
import { Search, Edit2, Trash2, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getProducts, updateProduct, deleteProduct, getCategories } from "@/lib/db";
import { Product, Category } from "@/lib/types";
import { formatDZD } from "@/lib/store";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "sonner";

export default function InventairePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
        setProducts(prods);
        setDbCategories(cats);
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
                  <article key={product.id} className="rounded-[1.75rem] bg-white p-4 shadow-sm ring-1 ring-[#dce8e6]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-base font-black leading-tight text-[#243740]">{product.name}</p>
                        <div className="mt-2 inline-flex rounded-full bg-[#eef5f4] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#628b9a]">
                          {category?.label}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className={`rounded-2xl px-3 py-2 text-center ${product.stock <= 5 ? "bg-red-50 text-red-500" : "bg-[#ecf8f0] text-[#41b86d]"}`}>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Stock</p>
                          <p className="text-lg font-black">{product.stock}</p>
                        </div>
                        <div className="flex gap-1 justify-center">
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
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Prix vente</p>
                        <p className="mt-1 text-sm font-black text-[#41b86d]">{formatDZD(product.priceSale)}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f7fbfa] px-3 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Unité</p>
                        <p className="mt-1 text-sm font-black text-[#243740]">{product.unit}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl bg-[#f7fbfa] px-3 py-3 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Péremption</p>
                        <p className="mt-1 text-sm font-semibold text-gray-600">
                          {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString("fr-FR") : "Aucune date"}
                        </p>
                      </div>
                      {product.barcode && (
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Code-barre</p>
                          <p className="mt-1 text-[10px] font-mono font-bold text-slate-500">{product.barcode}</p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="mb-12">
        <h2 className="text-5xl font-black tracking-tight text-[#3f5362]">Inventaire</h2>
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
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Stock</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Prix de vente</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Unité</th>
              <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Péremption</th>
              <th className="text-right px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const cat = dbCategories.find(c => c.key === p.category);
              return (
                <tr key={p.id} className="border-b last:border-0 border-gray-50 hover:bg-[#f0fbf4]/40 transition-colors group">
                  <td className="px-8 py-6 flex flex-col">
                    <span className="font-black text-gray-700 text-lg">{p.name}</span>
                    {p.barcode && <span className="text-[10px] font-mono text-gray-400 font-bold tracking-wider">{p.barcode}</span>}
                  </td>
                  <td className="px-8 py-6 font-bold text-gray-500 text-center">
                    <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-black uppercase tracking-widest">{cat?.label}</span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-2 rounded-xl text-xl font-black ${p.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100/50 text-green-700'}`}>{p.stock}</span>
                  </td>
                  <td className="px-8 py-6 text-center font-black text-2xl text-primary">{formatDZD(p.priceSale)}</td>
                  <td className="px-8 py-6 text-gray-400 font-black uppercase tracking-[0.15em] text-xs text-center">{p.unit}</td>
                  <td className="px-8 py-6 text-gray-500 font-bold text-center">{p.expiryDate ? new Date(p.expiryDate).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} className="h-10 w-10 p-0 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
                        <Edit2 className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-10 w-10 p-0 rounded-xl bg-red-50 text-red-300 hover:text-red-600 hover:bg-red-100 transition-all">
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
    </div>
  );
}
