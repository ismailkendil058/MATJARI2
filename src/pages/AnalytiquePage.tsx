import { useEffect, useMemo, useState, Fragment } from "react";
import { getSales, getPayments, getClients, getExpenses, getCategories } from "@/lib/db";
import { Sale, Payment, Client, Expense, Category } from "@/lib/types";
import { formatDZD } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_ICON_MAP } from "@/lib/icons";
import { Package } from "lucide-react";

export default function AnalytiquePage() {
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const todayObj = new Date();
  const [month, setMonth] = useState(todayObj.toISOString().slice(0, 7));
  const [day, setDay] = useState<string>(String(todayObj.getDate()).padStart(2, "0"));
  const [mobileView, setMobileView] = useState<"kpis" | "history">("kpis");
  const [showExpenseReductionDialog, setShowExpenseReductionDialog] = useState(false);
  const [showCategorySalesDialog, setShowCategorySalesDialog] = useState(false);

  useEffect(() => {
    getClients().then(setClients).catch(console.error);
    getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prefix = day ? `${month}-${day.padStart(2, "0")}` : month;
        const [salesData, paymentsData, expensesData] = await Promise.all([
          getSales(),
          getPayments(),
          getExpenses(prefix)
        ]);
        setAllSales(salesData);
        setAllPayments(paymentsData);
        setExpenses(expensesData);
      } catch (error) {
        console.error("Error loading analytics data:", error);
      }
    };
    loadData();
  }, [month, day]);

  const prefix = day ? `${month}-${day.padStart(2, "0")}` : month;

  const monthlySales = useMemo(() => {
    return allSales.filter(s => s.date.startsWith(prefix));
  }, [allSales, prefix]);

  const monthlyPayments = useMemo(() => {
    return allPayments.filter(p => p.date.startsWith(prefix));
  }, [allPayments, prefix]);

  const daysInMonth = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    const totalDays = new Date(year, m, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) =>
      String(i + 1).padStart(2, "0")
    );
  }, [month]);

  const getItemPurchaseCost = (item: CartItem) => {
    const unitCost = item.customUnitCost ?? item.product?.priceBuy ?? 0;
    return unitCost * (item.quantity || 0);
  };

  const getSalePurchaseCost = (sale: Sale) => {
    const cost = sale.items.reduce((s, i) => s + getItemPurchaseCost(i), 0);
    return sale.type === 'return' ? -Math.abs(cost) : cost;
  };

  const getSalesProfitMapAtDate = (
    salesList: Sale[],
    paymentsList: Payment[],
    cutoffIsoString?: string
  ) => {
    const salesUpToCutoff = cutoffIsoString
      ? salesList.filter(s => s.date <= cutoffIsoString)
      : salesList;
    const paymentsUpToCutoff = cutoffIsoString
      ? paymentsList.filter(p => p.date <= cutoffIsoString)
      : paymentsList;

    const clientPaymentsTotal = new Map<string, number>();
    paymentsUpToCutoff.forEach(p => {
      if (p.clientId) {
        clientPaymentsTotal.set(
          p.clientId,
          (clientPaymentsTotal.get(p.clientId) || 0) + p.amount
        );
      }
    });

    const clientSales = new Map<string, Sale[]>();
    salesUpToCutoff.forEach(s => {
      if (s.clientId && s.type === 'credit') {
        const list = clientSales.get(s.clientId) || [];
        list.push(s);
        clientSales.set(s.clientId, list);
      }
    });

    clientSales.forEach(list => {
      list.sort((a, b) => a.date.localeCompare(b.date));
    });

    const allocatedCreditPaymentPerSale = new Map<string, number>();
    clientSales.forEach((sList, clientId) => {
      let availablePayment = clientPaymentsTotal.get(clientId) || 0;
      for (const sale of sList) {
        const saleTotal = sale.total;
        const initialPaid = sale.paidAmount || 0;
        const creditOwed = Math.max(0, saleTotal - initialPaid);

        const allocated = Math.min(creditOwed, availablePayment);
        allocatedCreditPaymentPerSale.set(sale.id, allocated);
        availablePayment -= allocated;
      }
    });

    const profitMap = new Map<string, number>();
    salesUpToCutoff.forEach(sale => {
      const saleCost = getSalePurchaseCost(sale);
      const saleTotal = sale.type === 'return' ? -Math.abs(sale.total) : sale.total;

      if (sale.type === 'return') {
        profitMap.set(sale.id, saleTotal - saleCost);
        return;
      }

      if (sale.type === 'direct') {
        profitMap.set(sale.id, saleTotal - saleCost);
        return;
      }

      if (sale.type === 'credit') {
        const initialPaid = sale.paidAmount || 0;
        const allocatedCredit = allocatedCreditPaymentPerSale.get(sale.id) || 0;
        const totalPaid = initialPaid + allocatedCredit;

        const maxProfit = Math.max(0, saleTotal - saleCost);
        const recognizedProfit = Math.max(0, Math.min(maxProfit, totalPaid - saleCost));
        profitMap.set(sale.id, recognizedProfit);
      }
    });

    return profitMap;
  };

  const periodStartIso = day ? `${month}-${day.padStart(2, "0")}T00:00:00.000Z` : `${month}-01T00:00:00.000Z`;
  const periodEndIso = day ? `${month}-${day.padStart(2, "0")}T23:59:59.999Z` : `${month}-31T23:59:59.999Z`;

  const profitMapEnd = useMemo(() => {
    return getSalesProfitMapAtDate(allSales, allPayments, periodEndIso);
  }, [allSales, allPayments, periodEndIso]);

  const profitMapStart = useMemo(() => {
    return getSalesProfitMapAtDate(allSales, allPayments, periodStartIso);
  }, [allSales, allPayments, periodStartIso]);

  const salePeriodProfits = useMemo(() => {
    const map = new Map<string, number>();
    allSales.forEach(sale => {
      const pEnd = profitMapEnd.get(sale.id) || 0;
      const pStart = profitMapStart.get(sale.id) || 0;
      map.set(sale.id, pEnd - pStart);
    });
    return map;
  }, [allSales, profitMapEnd, profitMapStart]);

  const totalRevenue = monthlySales.reduce((s, sale) => {
    if (sale.type === 'return') return s - Math.abs(sale.total);
    return s + sale.total;
  }, 0);

  const totalPaymentCredits = monthlyPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const directCash = monthlySales.reduce((s, sale) => {
    if (sale.type === 'return') return s - Math.abs(sale.paidAmount || 0);
    return s + (sale.paidAmount || 0);
  }, 0);

  // Vente Encaissée: Total cash received from direct sales and credit payments.
  const venteEncaisser = directCash + totalPaymentCredits;

  const totalCost = monthlySales.reduce((s, sale) => {
    const saleCost = sale.items.reduce((is, item) => is + getItemPurchaseCost(item), 0);
    if (sale.type === 'return') return s - Math.abs(saleCost);
    return s + saleCost;
  }, 0);

  const totalReduction = monthlySales.reduce((s, sale) => {
    return sale.type === 'return' ? s - Math.abs(sale.reduction || 0) : s + (sale.reduction || 0);
  }, 0);

  const totalSalesProfit = useMemo(() => {
    let sum = 0;
    salePeriodProfits.forEach(p => { sum += p; });
    return sum;
  }, [salePeriodProfits]);

  const profit = totalSalesProfit;
  const totalCaisse = venteEncaisser;

  const categorySalesData = useMemo(() => {
    const map = new Map<string, {
      key: string;
      label: string;
      labelAr?: string;
      revenue: number;
      cost: number;
      profit: number;
      quantity: number;
      color?: string;
      icon?: string;
    }>();

    // 1. Process revenue, cost, quantity for sales in selected period
    monthlySales.forEach(sale => {
      const isReturn = sale.type === 'return';
      const multiplier = isReturn ? -1 : 1;

      sale.items.forEach(item => {
        const catKey = item.product?.category || "sans_categorie";
        const subtotal = item.subtotal ?? ((item.customUnitPrice ?? item.product?.priceSale ?? 0) * item.quantity);
        const itemCost = getItemPurchaseCost(item);
        const qty = item.quantity;

        const catObj = categories.find(c => c.key === catKey);

        const existing = map.get(catKey) || {
          key: catKey,
          label: catObj ? catObj.label : (catKey === "sans_categorie" ? "Sans catégorie" : catKey),
          labelAr: catObj?.labelAr,
          revenue: 0,
          cost: 0,
          profit: 0,
          quantity: 0,
          color: catObj?.color || "#3f5362",
          icon: catObj?.icon
        };

        existing.revenue += subtotal * multiplier;
        existing.cost += itemCost * multiplier;
        existing.quantity += qty * multiplier;

        map.set(catKey, existing);
      });
    });

    // 2. Attribute period profits to categories proportionally
    allSales.forEach(sale => {
      const periodP = salePeriodProfits.get(sale.id) || 0;
      if (periodP === 0) return;

      const itemPotentials = sale.items.map(item => {
        const subtotal = item.subtotal ?? ((item.customUnitPrice ?? item.product?.priceSale ?? 0) * item.quantity);
        const itemCost = getItemPurchaseCost(item);
        return Math.max(0, subtotal - itemCost);
      });

      const totalPotential = itemPotentials.reduce((a, b) => a + b, 0);

      sale.items.forEach((item, idx) => {
        const catKey = item.product?.category || "sans_categorie";
        const catObj = categories.find(c => c.key === catKey);

        const existing = map.get(catKey) || {
          key: catKey,
          label: catObj ? catObj.label : (catKey === "sans_categorie" ? "Sans catégorie" : catKey),
          labelAr: catObj?.labelAr,
          revenue: 0,
          cost: 0,
          profit: 0,
          quantity: 0,
          color: catObj?.color || "#3f5362",
          icon: catObj?.icon
        };

        let itemPeriodP = 0;
        if (totalPotential > 0) {
          itemPeriodP = periodP * (itemPotentials[idx] / totalPotential);
        } else {
          itemPeriodP = periodP / sale.items.length;
        }

        existing.profit += itemPeriodP;
        map.set(catKey, existing);
      });
    });

    const totalCatRevenue = Array.from(map.values()).reduce((s, c) => s + (c.revenue > 0 ? c.revenue : 0), 0);

    const list = Array.from(map.values())
      .map(cat => ({
        ...cat,
        percentage: totalCatRevenue > 0 && cat.revenue > 0 ? (cat.revenue / totalCatRevenue) * 100 : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return { list, totalCatRevenue };
  }, [monthlySales, allSales, salePeriodProfits, categories]);

  const [expandedDates, setExpandedDates] = useState<string[]>([]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const dailyGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        revenue: number;
        cost: number;
        creditCount: number;
        directCount: number;
        paymentCredits: number;
        expenseAmount: number;
        totalReduction: number;
        productNames: Set<string>;
        sales: typeof monthlySales;
        payments: (Payment & { clientName: string })[];
        expenses: Expense[];
      }
    >();

    monthlySales.forEach(sale => {
      const dayKey = sale.date.slice(0, 10);
      const existing = map.get(dayKey) || {
        date: dayKey,
        revenue: 0,
        cost: 0,
        creditCount: 0,
        directCount: 0,
        paymentCredits: 0,
        expenseAmount: 0,
        totalReduction: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: [],
        expenses: []
      };

      if (sale.type === 'return') {
        existing.revenue -= Math.abs(sale.total);
        existing.cost -= Math.abs(sale.items.reduce((s, i) => s + getItemPurchaseCost(i), 0));
        existing.totalReduction = (existing.totalReduction || 0) - Math.abs(sale.reduction || 0);
      } else {
        existing.revenue += sale.total;
        existing.cost += sale.items.reduce((s, i) => s + getItemPurchaseCost(i), 0);
        existing.totalReduction = (existing.totalReduction || 0) + (sale.reduction || 0);
        if (sale.type === "credit") {
          existing.creditCount += 1;
        } else {
          existing.directCount += 1;
        }
      }

      sale.items.forEach(item => existing.productNames.add(item.product.name));
      existing.sales.push(sale);
      map.set(dayKey, existing);
    });

    monthlyPayments.forEach(p => {
      const dayKey = p.date.slice(0, 10);
      const existing = map.get(dayKey) || {
        date: dayKey,
        revenue: 0,
        cost: 0,
        creditCount: 0,
        directCount: 0,
        paymentCredits: 0,
        expenseAmount: 0,
        totalReduction: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: [],
        expenses: []
      };
      existing.paymentCredits += p.amount;
      existing.payments.push({
        ...p,
        clientName: clients.find(c => c.id === p.clientId)?.name ?? "Client inconnu"
      });
      map.set(dayKey, existing);
    });

    expenses.forEach(e => {
      const dayKey = e.date.slice(0, 10);
      const existing = map.get(dayKey) || {
        date: dayKey,
        revenue: 0,
        cost: 0,
        creditCount: 0,
        directCount: 0,
        paymentCredits: 0,
        expenseAmount: 0,
        totalReduction: 0,
        productNames: new Set<string>(),
        sales: [],
        payments: [],
        expenses: []
      };
      existing.expenseAmount += e.amount;
      existing.expenses.push(e);
      map.set(dayKey, existing);
    });

    const groups = Array.from(map.values()).map(group => {
      const dayStartIso = `${group.date}T00:00:00.000Z`;
      const dayEndIso = `${group.date}T23:59:59.999Z`;

      const dayProfitMapEnd = getSalesProfitMapAtDate(allSales, allPayments, dayEndIso);
      const dayProfitMapStart = getSalesProfitMapAtDate(allSales, allPayments, dayStartIso);

      let daySalesProfit = 0;
      allSales.forEach(sale => {
        const pEnd = dayProfitMapEnd.get(sale.id) || 0;
        const pStart = dayProfitMapStart.get(sale.id) || 0;
        daySalesProfit += (pEnd - pStart);
      });

      return {
        ...group,
        productList: Array.from(group.productNames),
        profit: daySalesProfit - group.expenseAmount,
      };
    });

    groups.forEach(group => {
      group.sales.sort((a, b) => a.date.localeCompare(b.date));
    });

    return groups.sort((a, b) => a.date.localeCompare(b.date));
  }, [monthlySales, monthlyPayments, allSales, allPayments, clients, expenses]);

  return (
    <div className="p-8 lg:p-12 animate-fade-in bg-[#f4f8f8] min-h-screen font-sans text-gray-800">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-12">
        <div>
          <h2 className="text-5xl font-black tracking-tight text-[#3f5362]">Analytique</h2>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Input
            type="month"
            className="w-full max-w-[280px] bg-white border-gray-200 h-16 shadow-sm rounded-2xl font-black focus-visible:ring-0 text-[#3f5362] text-xl"
            value={month}
            onChange={e => { setMonth(e.target.value); setDay(""); }}
          />
          <div className="relative flex items-center">
            <select
              className="appearance-none w-64 h-16 px-6 pr-12 bg-white border border-gray-200 rounded-2xl font-black text-[#3f5362] shadow-sm focus:outline-none focus:ring-0 text-lg cursor-pointer"
              value={day}
              onChange={e => setDay(e.target.value)}
            >
              <option value="">Tout le mois</option>
              {daysInMonth.map(d => (
                <option key={d} value={d}>
                  {new Date(`${month}-${d}`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-6 text-gray-400 text-sm">▾</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <button
          type="button"
          onClick={() => setShowCategorySalesDialog(true)}
          className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in text-left text-current transition hover:-translate-y-1 hover:shadow-lg cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                Ventes Totales
              </p>
              <p className="text-3xl font-black text-[#3f5362] tracking-tighter">{formatDZD(totalRevenue)}</p>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-[#3f5362] bg-gray-100 group-hover:bg-[#3f5362] group-hover:text-white px-3 py-1.5 rounded-full transition-colors">
              Par catégorie
            </span>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs font-bold text-gray-400 group-hover:text-[#3f5362] transition-colors">
            <span>Voir détails par catégorie</span>
            <span>→</span>
          </div>
        </button>
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col justify-center animate-scale-in" style={{ animationDelay: '100ms' }}>
          <p className="text-xs font-black text-[#41b86d] uppercase tracking-widest mb-3">Vente Encaissée</p>
          <p className="text-3xl font-black text-[#41b86d] tracking-tighter">{formatDZD(venteEncaisser)}</p>
        </div>
        <div className={`rounded-3xl p-8 shadow-sm border flex flex-col justify-center animate-scale-in bg-white`} style={{ animationDelay: '300ms', borderColor: '#e6f4ea' }}>
          <p className={`text-xs font-black uppercase tracking-widest mb-3 ${profit >= 0 ? 'text-[#16a34a]' : 'text-red-500'}`}>Bénéfices</p>
          <p className={`text-3xl font-black tracking-tighter ${profit >= 0 ? 'text-[#16a34a]' : 'text-red-500'}`}>{formatDZD(profit)}</p>
          {totalRevenue > 0 && (
            <p className="text-sm mt-3 text-gray-500 font-bold">Marge: {(profit / totalRevenue * 100).toFixed(1)}%</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowExpenseReductionDialog(true)}
          className="bg-white rounded-3xl p-8 shadow-sm border flex flex-col justify-center animate-scale-in text-left text-current transition hover:-translate-y-1 hover:shadow-lg"
          style={{ animationDelay: '400ms', borderColor: '#fca5a5' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-3">Dépenses / Réduc</p>
              <p className="text-3xl font-black text-orange-500 tracking-tighter">{formatDZD(totalExpenses + totalReduction)}</p>
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Voir détails</span>
          </div>
          <div className="flex gap-4 text-xs mt-3 font-bold text-gray-400">
            <span>Dép: {formatDZD(totalExpenses)}</span>
            <span>Réd: {formatDZD(totalReduction)}</span>
          </div>
        </button>
      </div>

      <Dialog open={showExpenseReductionDialog} onOpenChange={setShowExpenseReductionDialog}>
        <DialogContent className="max-w-3xl bg-white border-0 shadow-2xl rounded-[2rem] p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-white border-b border-gray-100">
            <DialogTitle className="text-3xl font-black text-[#3f5362]">Dépenses / Réduction - Détails</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Dépenses</h4>
                {expenses.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune dépense enregistrée.</p>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className="rounded-3xl border border-gray-100 p-4 bg-gray-50">
                      <p className="font-black text-gray-700">{formatDZD(exp.amount)}</p>
                      <p className="text-sm text-gray-500">{exp.note || 'Sans description'}</p>
                      <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Réductions</h4>
                {monthlySales.filter(sale => (sale.reduction || 0) > 0).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune réduction appliquée.</p>
                ) : (
                  monthlySales.filter(sale => (sale.reduction || 0) > 0).map(sale => (
                    <div key={sale.id} className="rounded-3xl border border-gray-100 p-4 bg-gray-50">
                      <p className="font-black text-gray-700">{formatDZD(sale.reduction || 0)}</p>
                      <p className="text-sm text-gray-500">Vente #{sale.id} - {sale.clientId ? clients.find(c => c.id === sale.clientId)?.name ?? 'Client inconnu' : 'Client inconnu'}</p>
                      <p className="text-xs text-gray-400">{new Date(sale.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowExpenseReductionDialog(false)}
                className="h-12 px-6 rounded-2xl bg-gray-100 text-gray-700 font-black hover:bg-gray-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategorySalesDialog} onOpenChange={setShowCategorySalesDialog}>
        <DialogContent className="max-w-3xl bg-white border-0 shadow-2xl rounded-[2rem] p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-[#f8fafc] border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-black text-[#3f5362]">
                  Ventes Totales par Catégorie
                </DialogTitle>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                  Période : {day ? new Date(`${month}-${day}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : month}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#3f5362] block">{formatDZD(totalRevenue)}</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {categorySalesData.list.length} catégorie(s)
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-4 max-h-[65vh] overflow-y-auto">
            {categorySalesData.list.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-400 font-black text-xl uppercase tracking-widest">Aucune vente enregistrée</p>
              </div>
            ) : (
              categorySalesData.list.map(cat => {
                const IconComponent = cat.icon && CATEGORY_ICON_MAP[cat.icon] ? CATEGORY_ICON_MAP[cat.icon] : Package;
                const colorHex = cat.color || "#3f5362";

                return (
                  <div key={cat.key} className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm font-bold"
                          style={{ backgroundColor: colorHex }}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-lg text-[#3f5362]">{cat.label}</h4>
                            {cat.labelAr && <span className="text-xs text-gray-400 font-medium">({cat.labelAr})</span>}
                          </div>
                          <p className="text-xs text-gray-400 font-bold">
                            {cat.quantity} unit{cat.quantity > 1 ? 'és' : 'é'} vendue{cat.quantity > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-[#3f5362] block">
                          {formatDZD(cat.revenue)}
                        </span>
                        <div className="flex items-center justify-end gap-2 text-xs font-bold mt-0.5">
                          <span className="text-emerald-600 font-black">
                            Bénéfice: {formatDZD(cat.profit)}
                          </span>
                          {cat.revenue > 0 && (
                            <span className="text-gray-400">
                              ({((cat.profit / cat.revenue) * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCategorySalesDialog(false)}
              className="h-12 px-8 rounded-2xl bg-[#3f5362] text-white font-black hover:bg-[#2d3d49] transition-colors shadow-sm"
            >
              Fermer
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden min-h-[600px]">
        <div className="bg-gray-50/80 px-10 py-6 border-b border-gray-100">
          <h4 className="font-black text-xl text-[#3f5362] uppercase tracking-wide">
            Historique des Ventes — {day ? new Date(`${month}-${day}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : month}
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-white border-b border-gray-50">
              <tr>
                <th className="text-left px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Date / Client</th>
                <th className="text-center px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Statistiques</th>
                <th className="text-left px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Produits</th>
                <th className="text-right px-8 py-6 font-black text-xs uppercase tracking-[0.2em] text-gray-400">Recette</th>
              </tr>
            </thead>
            <tbody>
              {dailyGroups.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-32 text-gray-400 font-black text-2xl uppercase tracking-widest opacity-20">Aucune activité</td></tr>
              ) : (
                dailyGroups.map(group => {
                  const isOpen = expandedDates.includes(group.date);
                  const displayDate = new Date(group.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

                  return (
                    <Fragment key={group.date}>
                      <tr
                        className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                        onClick={() => toggleDate(group.date)}
                      >
                        <td className="px-8 py-8">
                          <p className="text-[#3f5362] font-black text-xl">{displayDate}</p>
                          <p className="text-xs text-gray-400 uppercase font-bold mt-1 tracking-wider">{group.sales.length} ventes effectuées</p>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <div className="flex justify-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-[#41b86d]/10 text-[#41b86d] text-xs font-black tracking-widest">{group.directCount} DIRECT</span>
                            {group.creditCount > 0 && <span className="px-3 py-1 rounded-full bg-red-50 text-red-500 text-xs font-black tracking-widest">{group.creditCount} CRÉDIT</span>}
                          </div>
                        </td>
                        <td className="px-8 py-8 font-bold text-gray-500 max-w-sm">
                          <p className="truncate">{group.productList.join(", ")}</p>
                        </td>
                        <td className="px-8 py-8 text-right">
                          <span className="font-black text-[#3f5362] text-2xl">{formatDZD(group.revenue)}</span>
                          <div className="mt-2 space-y-1">
                            {group.paymentCredits > 0 && (
                              <p className="text-xs text-[#41b86d] font-black">+ {formatDZD(group.paymentCredits)} payés</p>
                            )}
                            {group.totalReduction > 0 && (
                              <p className="text-xs text-red-500 font-black">- {formatDZD(group.totalReduction)} réduc.</p>
                            )}
                            {group.expenseAmount > 0 && (
                              <p className="text-xs text-orange-500 font-black">- {formatDZD(group.expenseAmount)} depense</p>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && group.sales.map(sale => (
                        <tr key={sale.id} className="bg-gray-50/30 border-t border-gray-100">
                          <td className="px-14 py-4 text-sm font-bold text-gray-500">
                            {new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {sale.username && <span className="ml-3 text-[11px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">VENTE PAR {sale.username.toUpperCase()}</span>}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full tracking-widest ${sale.type === 'credit' ? 'bg-red-50 text-red-500' : sale.type === 'return' ? 'bg-orange-50 text-orange-500' : 'bg-[#41b86d]/10 text-[#41b86d]'}`}>
                              {sale.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-sm text-gray-600 italic font-medium">
                            {sale.items.map(i => i.product.name).join(", ")}
                          </td>
                          <td className="px-8 py-4 text-right font-black text-gray-600 flex flex-col items-end">
                            <span className="text-lg">{sale.type === 'return' ? '-' : ''}{formatDZD(sale.total)}</span>
                            {sale.reduction > 0 && <span className="text-[10px] text-red-500 mt-1">{sale.type === 'return' ? '+' : '-'}{formatDZD(sale.reduction)} RÉDUCTION</span>}
                          </td>
                        </tr>
                      ))}
                      {isOpen && group.expenses.map(exp => (
                        <tr key={exp.id} className="bg-orange-50/20 border-t border-gray-100">
                          <td className="px-14 py-4 text-sm font-bold text-gray-500">
                            {new Date(exp.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-orange-100 text-orange-600 tracking-widest">
                              DÉPENSE
                            </span>
                          </td>
                          <td className="px-8 py-4 text-sm text-gray-600 italic font-bold">
                            {exp.note}
                          </td>
                          <td className="px-8 py-4 text-right font-black text-orange-600 text-lg">
                            - {formatDZD(exp.amount)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
