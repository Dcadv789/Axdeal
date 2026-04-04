"use client";

import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  Banknote,
  BadgeCheck,
  Briefcase,
  ClipboardList,
  Download,
  History,
  LayoutGrid,
  List,
  CreditCard,
  Pause,
  Play,
  Printer,
  User,
  Minus,
  Package2,
  Plus,
  QrCode,
  Receipt,
  X,
  Search,
  ShoppingCart,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PdvOperationalSummary } from "@/components/erp/PdvContent/pdv-operational-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/contexts/ThemeContext";

type PaymentMethod = "Dinheiro" | "PIX" | "Cartao";
type CardType = "Credito" | "Debito";
type ProductViewMode = "grid" | "list";
type LinkableDocumentType = "pedido_venda" | "ordem_servico";

type Product = {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  imagem?: string;
  categoria: string;
};

type CartItem = Product & {
  quantidade: number;
  desconto: number;
};

type Sale = {
  id: string;
  data: string;
  metodoPagamento: PaymentMethod;
  cliente: string;
  vendedor: string | null;
  linkedDocumentCode: string | null;
  linkedDocumentDescription: string | null;
  subtotal: number;
  desconto: number;
  total: number;
  itens: Array<{
    id: string;
    nome: string;
    preco: number;
    quantidade: number;
    desconto: number;
  }>;
};

type LinkableDocument = {
  id: string;
  tipo: LinkableDocumentType;
  codigo: string;
  cliente: string;
  descricao: string;
  total: number;
};

type ReceiptPreviewData = {
  company: {
    nome: string;
    documento: string;
    endereco: string;
    cidade: string;
    telefone: string;
  };
  saleId: string;
  issuedAt: string;
  operatorName: string;
  sellerName: string;
  clientName: string;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  changeAmount: number;
  linkedDocumentCode: string | null;
  items: Array<{
    id: string;
    nome: string;
    quantidade: number;
    preco: number;
    desconto: number;
    total: number;
  }>;
  subtotal: number;
  itemDiscountTotal: number;
  orderDiscount: number;
  total: number;
};

const STORAGE_PRODUCTS_KEY = "pdv_produtos";
const STORAGE_SALES_KEY = "vendas_realizadas";
const mockCompany = {
  nome: "Mercadinho Aurora Central",
  documento: "CNPJ 12.345.678/0001-99",
  endereco: "Rua das Palmeiras, 245 - Centro",
  cidade: "São Paulo - SP",
  telefone: "(11) 3333-2020",
};

const initialProducts: Product[] = [
  { id: "1", nome: "Cafe Especial 250g", preco: 24.9, estoque: 18, imagem: "CA", categoria: "Mercearia" },
  { id: "2", nome: "Agua Mineral 500ml", preco: 4.5, estoque: 42, imagem: "AG", categoria: "Bebidas" },
  { id: "3", nome: "Bolo de Fuba", preco: 18.75, estoque: 7, imagem: "BF", categoria: "Padaria" },
  { id: "4", nome: "Suco Integral Uva", preco: 12.9, estoque: 15, imagem: "SU", categoria: "Bebidas" },
  { id: "5", nome: "Cookie Artesanal", preco: 7.5, estoque: 24, imagem: "CK", categoria: "Confeitaria" },
  { id: "6", nome: "Sanduiche Natural", preco: 16.9, estoque: 9, imagem: "SN", categoria: "Lanches" },
];

const mockSalesOrders: LinkableDocument[] = [
  { id: "pv-101", tipo: "pedido_venda", codigo: "PV-101", cliente: "Empresa Atlas", descricao: "Pedido de venda Atlas", total: 1240 },
  { id: "pv-102", tipo: "pedido_venda", codigo: "PV-102", cliente: "Maria Oliveira", descricao: "Pedido de venda Maria", total: 890 },
];

const mockServiceOrders: LinkableDocument[] = [
  { id: "os-201", tipo: "ordem_servico", codigo: "OS-201", cliente: "Claudio Motors", descricao: "Ordem de serviço revisão", total: 1560 },
  { id: "os-202", tipo: "ordem_servico", codigo: "OS-202", cliente: "Hospital Vida", descricao: "Ordem de serviço suporte", total: 2320 },
];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const mockClients = ["Consumidor Final", "Maria Oliveira", "Empresa Atlas"];
const DEFAULT_SELLER_NAME = "Nao Selecionado";
const mockSellers = [DEFAULT_SELLER_NAME, "Carlos Lima", "Fernanda Rocha"];

export function PdvPage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const receiptPreviewRef = useRef<HTMLDivElement | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [cashReceivedInput, setCashReceivedInput] = useState("R$ 0,00");
  const [cardType, setCardType] = useState<CardType>("Debito");
  const [installmentsInput, setInstallmentsInput] = useState("1");
  const [discountInput, setDiscountInput] = useState("R$ 0,00");
  const [itemDiscountModalOpen, setItemDiscountModalOpen] = useState(false);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [itemDiscountInput, setItemDiscountInput] = useState("R$ 0,00");
  const [clientName, setClientName] = useState("Consumidor Final");
  const [sellerName, setSellerName] = useState(DEFAULT_SELLER_NAME);
  const [salePaused, setSalePaused] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [lastSalesModalOpen, setLastSalesModalOpen] = useState(false);
  const [historicalCancelConfirmOpen, setHistoricalCancelConfirmOpen] = useState(false);
  const [linkedDocument, setLinkedDocument] = useState<LinkableDocument | null>(null);
  const [selectedHistoricalSale, setSelectedHistoricalSale] = useState<Sale | null>(null);
  const [latestSales, setLatestSales] = useState<Sale[]>([]);
  const [viewMode, setViewMode] = useState<ProductViewMode>("grid");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadedProducts = loadInitialProducts();
    setProducts(loadedProducts);
    setLatestSales(readStorage<Sale[]>(STORAGE_SALES_KEY, []));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
  }, [mounted, products]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "F12") {
        event.preventDefault();
        if (cart.length === 0) {
          toast.error("Adicione itens ao carrinho antes de finalizar.");
          return;
        }
        setPaymentOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cart.length]);

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (linkModalOpen || clientModalOpen || sellerModalOpen || receiptModalOpen || lastSalesModalOpen || historicalCancelConfirmOpen) {
        return;
      }

      if (event.key === "F4") {
        event.preventDefault();
        setClientModalOpen(true);
      }

      if (event.key === "F5") {
        event.preventDefault();
        setSellerModalOpen(true);
      }

      if (event.key === "F8") {
        event.preventDefault();
        togglePausedState();
      }

      if (event.key === "F6") {
        event.preventDefault();
        if (cart.length === 0 && parseCurrencyInput(discountInput) === 0) {
          toast.error("Nao ha descontos aplicados.");
          return;
        }

        setCart((current) => current.map((item) => ({ ...item, desconto: 0 })));
        setDiscountInput("R$ 0,00");
        setItemDiscountInput("R$ 0,00");
        toast.success("Todos os descontos foram removidos.");
      }

      if (event.key === "F7") {
        event.preventDefault();
        if (cart.length === 0) {
          toast.error("O carrinho ja esta vazio.");
          return;
        }

        setCart([]);
        setLinkedDocument(null);
        setDiscountInput("R$ 0,00");
        setItemDiscountInput("R$ 0,00");
        setSelectedCartItemId(null);
        setItemDiscountModalOpen(false);
        toast.success("Itens removidos do carrinho.");
      }

      if (event.key === "F9") {
        event.preventDefault();
        if (cart.length === 0) {
          toast.error("Adicione itens antes de gerar o recibo.");
          return;
        }

        setReceiptModalOpen(true);
      }

      if (event.key === "F10") {
        event.preventDefault();
        setLastSalesModalOpen(true);
      }

      if (event.key === "F11" && selectedHistoricalSale) {
        event.preventDefault();
        exitHistoricalSale();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (selectedHistoricalSale) {
          setHistoricalCancelConfirmOpen(true);
          return;
        }

        if (cart.length === 0 && !linkedDocument && parseCurrencyInput(discountInput) === 0) {
          toast.error("Nao ha venda em andamento para cancelar.");
          return;
        }

        setCart([]);
        setLinkedDocument(null);
        setDiscountInput("R$ 0,00");
        setItemDiscountInput("R$ 0,00");
        setSelectedCartItemId(null);
        setItemDiscountModalOpen(false);
        setClientName("Consumidor Final");
        setSellerName("NÃƒÂ£o Selecionado");
        setPaymentMethod("PIX");
        setPaymentOpen(false);
        setSalePaused(false);
        toast.success("Venda cancelada e caixa pronto para um novo atendimento.");
      }
    }

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [cart.length, clientModalOpen, discountInput, historicalCancelConfirmOpen, lastSalesModalOpen, linkModalOpen, linkedDocument, receiptModalOpen, selectedHistoricalSale, sellerModalOpen]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.nome.toLowerCase().includes(normalizedSearch) ||
        product.categoria.toLowerCase().includes(normalizedSearch) ||
        product.id.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, search]);

  const grossSubtotal = cart.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const itemDiscountTotal = cart.reduce((acc, item) => acc + Math.min(item.desconto, item.preco * item.quantidade), 0);
  const subtotal = Math.max(grossSubtotal - itemDiscountTotal, 0);
  const safeDiscount = parseCurrencyInput(discountInput);
  const total = Math.max(subtotal - safeDiscount, 0);
  const operatorName = "Administrador";
  const enteredCashReceived = parseCurrencyInput(cashReceivedInput);
  const cashReceived = paymentMethod === "Dinheiro" ? enteredCashReceived : total;
  const changeAmount = paymentMethod === "Dinheiro" ? Math.max(cashReceived - total, 0) : 0;
  const receiptPreview = useMemo<ReceiptPreviewData>(
    () => ({
      company: mockCompany,
      saleId: selectedHistoricalSale?.id ?? linkedDocument?.codigo ?? `CUPOM-${Date.now().toString().slice(-6)}`,
      issuedAt: selectedHistoricalSale
        ? new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(selectedHistoricalSale.data))
        : new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date()),
      operatorName,
      sellerName,
      clientName,
      paymentMethod,
      cashReceived,
      changeAmount,
      linkedDocumentCode: linkedDocument?.codigo ?? null,
      items: cart.map((item) => ({
        id: item.id,
        nome: item.nome,
        quantidade: item.quantidade,
        preco: item.preco,
        desconto: item.desconto,
        total: Math.max(item.preco * item.quantidade - item.desconto, 0),
      })),
      subtotal,
      itemDiscountTotal,
      orderDiscount: safeDiscount,
      total,
    }),
    [cart, cashReceived, changeAmount, clientName, itemDiscountTotal, linkedDocument?.codigo, operatorName, paymentMethod, safeDiscount, selectedHistoricalSale, sellerName, subtotal, total],
  );
  const isHistoricalSaleLocked = selectedHistoricalSale !== null;

  function addToCart(product: Product) {
    if (selectedHistoricalSale) {
      toast.error("Esta venda carregada esta bloqueada para edicao.");
      return;
    }

    if (linkedDocument) {
      toast.error("Existe um Pedido de Venda/O.S vinculado. Troque ou remova o vinculo para incluir outros produtos.");
      return;
    }

    if (product.estoque <= 0) {
      toast.error("Produto sem estoque no mock atual.");
      return;
    }

    setCart((current) => {
      const existingItem = current.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantidade >= product.estoque) {
          toast.error("Quantidade maxima em estoque atingida.");
          return current;
        }

        return current.map((item) =>
          item.id === product.id ? { ...item, quantidade: item.quantidade + 1 } : item,
        );
      }

      return [...current, { ...product, quantidade: 1, desconto: 0 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    if (selectedHistoricalSale) {
      toast.error("Esta venda carregada esta bloqueada para edicao.");
      return;
    }

    setCart((current) => {
      return current
        .map((item) => {
          if (item.id !== productId) {
            return item;
          }

          const product = products.find((entry) => entry.id === productId);
          const maxStock = product?.estoque ?? item.estoque;
          const nextQuantity = Math.min(Math.max(item.quantidade + delta, 0), maxStock);
          return {
            ...item,
            quantidade: nextQuantity,
            desconto: Math.min(item.desconto, item.preco * nextQuantity),
          };
        })
        .filter((item) => item.quantidade > 0);
    });
  }

  function removeItem(productId: string) {
    if (selectedHistoricalSale) {
      toast.error("Use apenas cancelar ou imprimir recibo para vendas carregadas.");
      return;
    }

    setCart((current) => current.filter((item) => item.id !== productId));
    if (linkedDocument?.id === productId) {
      setLinkedDocument(null);
    }
  }

  function openPayment() {
    if (selectedHistoricalSale) {
      toast.error("Vendas carregadas nao podem ser finalizadas novamente.");
      return;
    }

    if (cart.length === 0) {
      toast.error("Adicione itens ao carrinho antes de finalizar.");
      return;
    }

    setPaymentMethod("PIX");
    setCashReceivedInput(money.format(total));
    setCardType("Debito");
    setInstallmentsInput("1");
    setPaymentOpen(true);
  }

  function handlePaymentMethodChange(value: PaymentMethod) {
    setPaymentMethod(value);

    if (value === "Dinheiro") {
      setCashReceivedInput(money.format(total));
      return;
    }

    if (value === "Cartao") {
      setCardType("Credito");
      setInstallmentsInput("1");
      return;
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    if (filteredProducts.length === 1) {
      event.preventDefault();
      addToCart(filteredProducts[0]);
    }
  }

  function openItemDiscountModal(item: CartItem) {
    if (selectedHistoricalSale) {
      toast.error("Esta venda carregada esta bloqueada para edicao.");
      return;
    }

    setSelectedCartItemId(item.id);
    setItemDiscountInput(money.format(item.desconto));
    setItemDiscountModalOpen(true);
  }

  function applyItemDiscount() {
    if (!selectedCartItemId) {
      return;
    }

    const parsedDiscount = parseCurrencyInput(itemDiscountInput);

    setCart((current) =>
      current.map((item) => {
        if (item.id !== selectedCartItemId) {
          return item;
        }

        const maxDiscount = item.preco * item.quantidade;
        return {
          ...item,
          desconto: Math.min(parsedDiscount, maxDiscount),
        };
      }),
    );

    setItemDiscountModalOpen(false);
    setSelectedCartItemId(null);
    setItemDiscountInput("R$ 0,00");
    toast.success("Desconto do item atualizado.");
  }

  function selectClient(value: string) {
    if (selectedHistoricalSale) {
      toast.error("Esta venda carregada esta bloqueada para edicao.");
      return;
    }

    setClientName(value);
    setClientModalOpen(false);
    toast.success(`Cliente selecionado: ${value}`);
  }

  function selectSeller(value: string) {
    if (selectedHistoricalSale) {
      toast.error("Esta venda carregada esta bloqueada para edicao.");
      return;
    }

    setSellerName(value);
    setSellerModalOpen(false);
    toast.success(`Vendedor selecionado: ${value}`);
  }

  function togglePausedState() {
    setSalePaused((current) => {
      const nextValue = !current;
      toast.success(nextValue ? "Venda movida para aguardando." : "Venda retomada.");
      return nextValue;
    });
  }

  function linkDocument(document: LinkableDocument) {
    if (selectedHistoricalSale) {
      toast.error("Esta venda carregada esta bloqueada para edicao.");
      return;
    }

    setLinkedDocument(document);
    setCart([
      {
        id: document.id,
        nome: `${document.codigo} - ${document.descricao}`,
        preco: document.total,
        estoque: 1,
        quantidade: 1,
        desconto: 0,
        categoria: document.tipo === "pedido_venda" ? "Pedido de Venda" : "Ordem de Serviço",
        imagem: document.tipo === "pedido_venda" ? "PV" : "OS",
      },
    ]);
    setLinkModalOpen(false);
    toast.success(`${document.codigo} vinculado ao cupom.`);
  }

  function finalizeSale() {
    if (cart.length === 0) {
      toast.error("Nao ha itens no carrinho.");
      return;
    }

    if (paymentMethod === "Dinheiro" && cashReceived < total) {
      toast.error("O valor em dinheiro recebido precisa ser maior ou igual ao total.");
      return;
    }

    const sale: Sale = {
      id: `VENDA-${Date.now()}`,
      data: new Date().toISOString(),
      metodoPagamento: paymentMethod,
      cliente: clientName,
      vendedor: sellerName === DEFAULT_SELLER_NAME ? null : sellerName,
      linkedDocumentCode: linkedDocument?.codigo ?? null,
      linkedDocumentDescription: linkedDocument?.descricao ?? null,
      subtotal,
      desconto: safeDiscount,
      total,
      itens: cart.map((item) => ({
        id: item.id,
        nome: item.nome,
        preco: item.preco,
        quantidade: item.quantidade,
        desconto: item.desconto,
      })),
    };

    const existingSales = readStorage<Sale[]>(STORAGE_SALES_KEY, []);
    const updatedSales = [sale, ...existingSales];
    localStorage.setItem(STORAGE_SALES_KEY, JSON.stringify(updatedSales));
    setLatestSales(updatedSales);

    setProducts((current) =>
      current.map((product) => {
        const soldItem = cart.find((item) => item.id === product.id);
        if (!soldItem) {
          return product;
        }

        return {
          ...product,
          estoque: Math.max(product.estoque - soldItem.quantidade, 0),
        };
      }),
    );

    setCart([]);
    setLinkedDocument(null);
    setDiscountInput("R$ 0,00");
    setItemDiscountInput("R$ 0,00");
    setSelectedCartItemId(null);
    setItemDiscountModalOpen(false);
    setClientName("Consumidor Final");
    setPaymentMethod("PIX");
    setCashReceivedInput("R$ 0,00");
    setCardType("Debito");
    setInstallmentsInput("1");
    setPaymentOpen(false);
    setSellerName(DEFAULT_SELLER_NAME);
    setSelectedHistoricalSale(null);
    toast.success("Venda salva no localStorage com sucesso.");
  }

  function clearAllDiscounts() {
    if (selectedHistoricalSale) {
      toast.error("Use apenas cancelar ou imprimir recibo para vendas carregadas.");
      return;
    }

    if (cart.length === 0 && parseCurrencyInput(discountInput) === 0) {
      toast.error("Nao ha descontos aplicados.");
      return;
    }

    setCart((current) => current.map((item) => ({ ...item, desconto: 0 })));
    setDiscountInput("R$ 0,00");
    setItemDiscountInput("R$ 0,00");
    toast.success("Todos os descontos foram removidos.");
  }

  function clearCart() {
    if (selectedHistoricalSale) {
      toast.error("Use cancelar venda para remover uma venda carregada.");
      return;
    }

    if (cart.length === 0) {
      toast.error("O carrinho ja esta vazio.");
      return;
    }

    setCart([]);
    setLinkedDocument(null);
    setDiscountInput("R$ 0,00");
    setItemDiscountInput("R$ 0,00");
    setSelectedCartItemId(null);
    setItemDiscountModalOpen(false);
    setClientName("Consumidor Final");
    toast.success("Itens removidos do carrinho.");
  }

  function exitHistoricalSale() {
    setSelectedHistoricalSale(null);
    setCart([]);
    setLinkedDocument(null);
    setDiscountInput("R$ 0,00");
    setItemDiscountInput("R$ 0,00");
    setSelectedCartItemId(null);
    setItemDiscountModalOpen(false);
    setClientName("Consumidor Final");
    setSellerName(DEFAULT_SELLER_NAME);
    setPaymentMethod("PIX");
    setCashReceivedInput("R$ 0,00");
    setCardType("Debito");
    setInstallmentsInput("1");
    setPaymentOpen(false);
    setSalePaused(false);
    setHistoricalCancelConfirmOpen(false);
    toast.success("Visualizacao da venda encerrada. PDV pronto para nova operacao.");
  }

  function cancelSale() {
    if (cart.length === 0 && !linkedDocument && parseCurrencyInput(discountInput) === 0) {
      toast.error("Nao ha venda em andamento para cancelar.");
      return;
    }

    if (selectedHistoricalSale) {
      setHistoricalCancelConfirmOpen(true);
      return;
    }

    setCart([]);
    setLinkedDocument(null);
    setDiscountInput("R$ 0,00");
    setItemDiscountInput("R$ 0,00");
    setSelectedCartItemId(null);
    setItemDiscountModalOpen(false);
    setClientName("Consumidor Final");
    setSellerName("NÃƒÂ£o Selecionado");
    setPaymentMethod("PIX");
    setCashReceivedInput("R$ 0,00");
    setCardType("Debito");
    setInstallmentsInput("1");
    setPaymentOpen(false);
    setSalePaused(false);
    setSellerName(DEFAULT_SELLER_NAME);
    setSelectedHistoricalSale(null);
    toast.success("Venda cancelada e caixa pronto para um novo atendimento.");
  }

  function loadHistoricalSale(sale: Sale) {
    setSelectedHistoricalSale(sale);
    setCart(
      sale.itens.map((item) => ({
        id: item.id,
        nome: item.nome,
        preco: item.preco,
        estoque: item.quantidade,
        quantidade: item.quantidade,
        desconto: item.desconto,
        categoria: "Venda anterior",
        imagem: item.nome.slice(0, 2).toUpperCase(),
      })),
    );
    setClientName(sale.cliente);
    setSellerName(sale.vendedor ?? DEFAULT_SELLER_NAME);
    setPaymentMethod(sale.metodoPagamento);
    setDiscountInput(money.format(sale.desconto));
    setItemDiscountInput("R$ 0,00");
    setSelectedCartItemId(null);
    setItemDiscountModalOpen(false);
    setLinkedDocument(
      sale.linkedDocumentCode
        ? {
            id: sale.linkedDocumentCode,
            tipo: "pedido_venda",
            codigo: sale.linkedDocumentCode,
            cliente: sale.cliente,
            descricao: sale.linkedDocumentDescription ?? "Venda carregada do historico",
            total: sale.total,
          }
        : null,
    );
    setLastSalesModalOpen(false);
    toast.success("Venda carregada em modo de consulta.");
  }

  async function captureReceiptCanvas() {
    if (!receiptPreviewRef.current) {
      toast.error("Abra a visualizacao do recibo antes de imprimir ou baixar o PDF.");
      return null;
    }

    return html2canvas(receiptPreviewRef.current, {
      backgroundColor: "#fffdf7",
      scale: 2,
      useCORS: true,
      onclone: (clonedDocument) => {
        const receipt = clonedDocument.querySelector('[data-receipt-capture="true"]') as HTMLElement | null;
        if (receipt) {
          receipt.style.border = "none";
          receipt.style.boxShadow = "none";
          receipt.style.borderRadius = "0";
        }
      },
    });
  }

  async function printReceipt() {
    if (cart.length === 0) {
      toast.error("Adicione itens antes de gerar o recibo.");
      return;
    }

    const canvas = await captureReceiptCanvas();
    if (!canvas) {
      return;
    }

    const imageData = canvas.toDataURL("image/png");
    const receiptWindow = window.open("", "_blank", "width=420,height=760");
    if (!receiptWindow) {
      toast.error("Nao foi possivel abrir a janela de impressao.");
      return;
    }

    receiptWindow.document.write(buildReceiptPrintHtml(imageData, canvas.width, canvas.height));
    receiptWindow.document.close();
    receiptWindow.focus();
  }

  async function downloadReceiptPdf() {
    if (cart.length === 0) {
      toast.error("Adicione itens antes de baixar o PDF.");
      return;
    }

    const canvas = await captureReceiptCanvas();
    if (!canvas) {
      return;
    }

    const imageData = canvas.toDataURL("image/png");
    const thermalWidthMm = 80;
    const pdfHeight = (canvas.height * thermalWidthMm) / canvas.width;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [thermalWidthMm, pdfHeight],
    });

    pdf.addImage(imageData, "PNG", 0, 0, thermalWidthMm, pdfHeight);
    pdf.save(`${receiptPreview.saleId.toLowerCase()}-recibo.pdf`);
  }

  return (
    <>
      <main className="h-screen w-screen overflow-hidden bg-white px-2 py-2 dark:bg-neutral-900/70 lg:px-3">
        <div className="grid h-full min-h-0 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(430px,520px)]">
          <div className="flex min-h-0 flex-col gap-2.5">
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-[#E5E7EB] bg-white shadow-sm dark:border-[#262626] dark:bg-black dark:shadow-none">
            <CardHeader className="space-y-3 border-b border-[#E5E7EB] bg-white p-4 dark:border-[#262626] dark:bg-black">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300">PDV</Badge>
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 transition hover:bg-blue-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Sair do PDV
                    </button>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700 transition hover:bg-blue-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                      {isDark ? "Light mode" : "Dark mode"}
                    </button>
                  </div>
                  <CardTitle className="text-xl text-slate-900 md:text-2xl dark:text-foreground">Frente de Caixa</CardTitle>
                  <CardDescription className="mt-1.5 text-sm text-muted-foreground">
                    Busca rapida, clique para adicionar e leitura grande para operacao em balcÃ£o.
                  </CardDescription>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <HeaderInfo label="Cliente" value={clientName} shortcut="F4" icon={User} onClick={() => setClientModalOpen(true)} />
                  <HeaderInfo label="Vendedor" value={sellerName} shortcut="F5" icon={BadgeCheck} onClick={() => setSellerModalOpen(true)} />
                  <HeaderInfo
                    label="Aguarde"
                    value={salePaused ? "Venda em espera" : "Venda normal no caixa"}
                    shortcut="F8"
                    icon={salePaused ? Pause : Play}
                    active={salePaused}
                    onClick={togglePausedState}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Buscar por nome ou categoria"
                    className="h-12 rounded-2xl border-blue-100 bg-white/90 pl-12 text-sm shadow-sm shadow-blue-100/50 dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-100 dark:shadow-none"
                  />
                </div>
                <div className="inline-flex rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-sm dark:border-[#262626] dark:bg-neutral-900 dark:shadow-none">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium transition ${
                      viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium transition ${
                      viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    <List className="h-4 w-4" />
                    Lista
                  </button>
                </div>
              </div>

            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-hidden p-4 pt-5">
              <div className="h-full min-h-0 overflow-y-auto pr-1">
                {viewMode === "grid" ? (
                  filteredProducts.length === 0 ? (
                    <EmptyProductsState />
                  ) : (
                    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1700px]:grid-cols-5 min-[2150px]:grid-cols-6">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addToCart(product)}
                          className="group rounded-[1.35rem] border border-blue-100 bg-white/90 p-3 text-left shadow-sm shadow-blue-100/40 transition hover:-translate-y-1 hover:border-primary/35 hover:bg-primary/10 hover:shadow-md hover:shadow-blue-100/60 dark:border-[#262626] dark:bg-neutral-900 dark:shadow-none dark:hover:bg-neutral-800"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-semibold text-primary-foreground">
                              {product.imagem ?? product.nome.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
                              {product.categoria}
                            </span>
                          </div>

                          <div className="mt-2.5 space-y-1">
                            <h3 className="text-base font-semibold leading-tight text-foreground">{product.nome}</h3>
                            <p className="text-xs text-muted-foreground">Codigo: #{product.id}</p>
                            <p className="text-xs text-muted-foreground">Estoque disponivel: {product.estoque}</p>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between">
                            <p className="text-lg font-bold text-primary">{money.format(product.preco)}</p>
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
                              <Plus className="h-4 w-4" />
                              Adicionar
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-blue-100 bg-white/80 shadow-sm shadow-blue-100/40 dark:border-[#262626] dark:bg-black dark:shadow-none">
                    <div className="mx-3.5 mt-3 grid shrink-0 grid-cols-[minmax(0,1.6fr)_110px_90px_110px_120px] items-center gap-3 rounded-[1rem] border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50/80 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-300">
                      <span>Produto</span>
                      <span>CÃ³digo</span>
                      <span>Estoque</span>
                      <span className="text-right">PreÃ§o</span>
                      <span className="text-right">AÃ§Ã£o</span>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
                      {filteredProducts.length === 0 ? (
                        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                          <Package2 className="h-8 w-8 text-muted-foreground" />
                          <p className="text-base font-medium text-foreground/90">Nenhum produto encontrado</p>
                          <p className="max-w-md text-xs text-muted-foreground">Ajuste a busca para localizar itens mockados no estoque local.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            className="grid grid-cols-[minmax(0,1.6fr)_110px_90px_110px_120px] items-center gap-3 rounded-[1.15rem] border border-blue-100 bg-white/90 px-4 py-3 shadow-sm shadow-blue-100/30 transition hover:border-primary/25 hover:bg-primary/10 hover:shadow-blue-100/50 dark:border-[#262626] dark:bg-neutral-900 dark:shadow-none dark:hover:bg-neutral-800"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-[10px] font-semibold text-primary-foreground">
                                {product.imagem ?? product.nome.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{product.nome}</p>
                                <p className="truncate text-xs text-muted-foreground">{product.categoria}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground/90">#{product.id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{product.estoque} un.</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-primary">{money.format(product.preco)}</p>
                            </div>
                            <div className="flex justify-end">
                              <Button onClick={() => addToCart(product)} className="h-9 rounded-xl px-3 text-xs">
                                <Plus className="mr-1 h-4 w-4" />
                                Adicionar
                              </Button>
                            </div>
                          </div>
                        ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            </Card>

            <PdvOperationalSummary
              operatorName={operatorName}
              linkedDocumentCode={linkedDocument ? linkedDocument.codigo : null}
              linkedDocumentDescription={linkedDocument ? linkedDocument.descricao : null}
              onOpenLinkModal={() => setLinkModalOpen(true)}
              onPrintReceipt={() => setReceiptModalOpen(true)}
              onOpenLastSales={() => setLastSalesModalOpen(true)}
            />
          </div>

          <Card className="flex h-full min-h-0 flex-col overflow-hidden border-[#E5E7EB] bg-white shadow-sm dark:border-[#262626] dark:bg-black dark:shadow-none">
            <CardHeader className="border-b border-[#E5E7EB] p-4 dark:border-[#262626]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Badge className="mb-2">Cupom Fiscal</Badge>
                  <CardTitle className="text-xl">Carrinho</CardTitle>
                  <CardDescription className="mt-1.5 text-sm text-muted-foreground">
                    {isHistoricalSaleLocked
                      ? "Venda carregada do historico. Apenas cancelamento e recibo estao disponiveis."
                      : "Ajuste quantidades direto no cupom e finalize com um clique."}
                  </CardDescription>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-100/80 p-3 shadow-sm shadow-blue-100/60 dark:border-blue-500/25 dark:bg-blue-500/10 dark:shadow-none">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-6">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Itens</p>
                  {isHistoricalSaleLocked ? (
                    <span className="rounded-full border border-secondary/70 bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
                      Venda bloqueada
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-foreground/90">{cart.reduce((acc, item) => acc + item.quantidade, 0)}</p>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 24, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 24, scale: 0.96 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-[1.05rem] border border-blue-100 bg-white/90 p-2.5 shadow-sm shadow-blue-100/40 dark:border-[#262626] dark:bg-neutral-900 dark:shadow-none"
                    >
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{item.nome}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                              <p className="truncate text-xs text-muted-foreground">{money.format(item.preco)} por unidade</p>
                              <span className="hidden h-1 w-1 rounded-full bg-border xl:block" />
                              <p className="text-xs font-medium text-primary">Unitario: {money.format(item.preco)}</p>
                            </div>
                            {item.desconto > 0 ? (
                              <p className="mt-0.5 truncate text-[11px] font-medium text-secondary-foreground">
                                Desconto no item: -{money.format(item.desconto)}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 xl:shrink-0">
                            <button
                              type="button"
                              onClick={() => openItemDiscountModal(item)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 text-[11px] text-blue-700 transition hover:bg-blue-100 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/15"
                            >
                              <Plus className="h-3 w-3" />
                              Desconto
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-rose-50 hover:text-destructive dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-2.5 py-2 dark:border-[#262626] dark:bg-neutral-950">
                          <div className="flex items-center gap-2.5">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Qtd</p>
                            <div className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-white/90 p-0.5 shadow-sm shadow-blue-100/40 dark:border-[#262626] dark:bg-black dark:shadow-none">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="rounded-lg p-2 text-blue-700 transition hover:bg-blue-100 dark:text-muted-foreground dark:hover:bg-muted/70"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="min-w-7 text-center text-sm font-semibold text-foreground">{item.quantidade}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="rounded-lg p-2 text-blue-700 transition hover:bg-blue-100 dark:text-muted-foreground dark:hover:bg-muted/70"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Total</p>
                            <p className="text-base font-bold text-primary">
                              {money.format(Math.max(item.preco * item.quantidade - item.desconto, 0))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {cart.length === 0 ? (
                  <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-blue-100 bg-blue-50/50 text-center dark:border-[#262626] dark:bg-neutral-950">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                    <p className="text-lg font-medium text-foreground/90">Carrinho vazio</p>
                    <p className="max-w-sm text-xs text-muted-foreground">Clique em um produto do lado esquerdo para comecar o cupom fiscal.</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-3.5 grid gap-3">
                <div className="space-y-3 rounded-3xl border border-blue-100 bg-gradient-to-b from-blue-50/85 via-white to-sky-50/70 p-3.5 shadow-sm shadow-blue-100/50 dark:border-[#262626] dark:bg-none dark:bg-neutral-950 dark:shadow-none">
                  {itemDiscountTotal > 0 ? (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Desc. itens</span>
                      <span className="font-semibold text-secondary-foreground">-{money.format(itemDiscountTotal)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">{money.format(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    <label className="text-xs font-medium text-muted-foreground">Desconto</label>
                  <Input
                    disabled={isHistoricalSaleLocked}
                    inputMode="numeric"
                    value={discountInput}
                    onChange={(event) => setDiscountInput(formatCurrencyInput(event.target.value))}
                    onFocus={(event) => event.currentTarget.select()}
                    className="h-10 w-[150px] rounded-2xl border-blue-100 bg-white/90 text-right text-sm font-semibold tabular-nums shadow-sm shadow-blue-100/40 dark:border-[#262626] dark:bg-black dark:text-slate-100 dark:shadow-none"
                  />
                </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Descontos</span>
                    <span className="font-semibold text-secondary-foreground">-{money.format(safeDiscount)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-border/70 pt-4">
                    <span className="text-base font-medium text-foreground/90">Total</span>
                    <span className="text-xl font-bold text-primary">{money.format(total)}</span>
                  </div>

                  {isHistoricalSaleLocked ? (
                    <div className="grid gap-2">
                      <Button onClick={() => setReceiptModalOpen(true)} className="h-12 w-full rounded-2xl text-sm font-bold uppercase tracking-[0.14em]">
                        Imprimir Recibo (F9)
                      </Button>
                      <Button
                        onClick={exitHistoricalSale}
                        variant="ghost"
                        className="h-11 w-full rounded-2xl border border-primary/20 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        Sair da venda carregada (F11)
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={openPayment} className="h-12 w-full rounded-2xl text-sm font-bold uppercase tracking-[0.14em]">
                      Finalizar Venda (F12)
                    </Button>
                  )}
                  <Button
                    onClick={cancelSale}
                    variant="ghost"
                    className="h-11 w-full rounded-2xl border border-border/70 text-sm font-medium text-muted-foreground hover:bg-muted/40"
                  >
                    <X className="mr-2 h-4 w-4 text-destructive" />
                    Cancelar Venda (ESC)
                  </Button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      onClick={clearAllDiscounts}
                      variant="ghost"
                      className="h-10 rounded-2xl border border-border/70 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:bg-muted/40"
                    >
                      Limpar descontos (F6)
                    </Button>
                    <Button
                      onClick={clearCart}
                      variant="ghost"
                      className="h-10 rounded-2xl border border-border/70 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:bg-muted/40"
                    >
                      Limpar itens (F7)
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <PaymentModal
        open={paymentOpen}
        paymentMethod={paymentMethod}
        setPaymentMethod={handlePaymentMethodChange}
        cashReceivedInput={cashReceivedInput}
        setCashReceivedInput={setCashReceivedInput}
        changeAmount={changeAmount}
        total={total}
        cardType={cardType}
        setCardType={setCardType}
        installmentsInput={installmentsInput}
        setInstallmentsInput={setInstallmentsInput}
        onClose={() => setPaymentOpen(false)}
        onConfirm={finalizeSale}
      />

      <ItemDiscountModal
        open={itemDiscountModalOpen}
        value={itemDiscountInput}
        onChange={setItemDiscountInput}
        onClose={() => {
          setItemDiscountModalOpen(false);
          setSelectedCartItemId(null);
          setItemDiscountInput("R$ 0,00");
        }}
        onConfirm={applyItemDiscount}
      />

      <SelectionModal
        open={clientModalOpen}
        badge="Cliente"
        title="Selecionar cliente"
        placeholder="Buscar cliente"
        items={mockClients}
        onClose={() => setClientModalOpen(false)}
        onSelect={selectClient}
      />

      <SelectionModal
        open={sellerModalOpen}
        badge="Vendedor"
        title="Selecionar vendedor"
        placeholder="Buscar vendedor"
        items={mockSellers}
        onClose={() => setSellerModalOpen(false)}
        onSelect={selectSeller}
      />

      <LinkDocumentModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onLink={linkDocument}
      />

      <ReceiptPreviewModal
        open={receiptModalOpen}
        data={receiptPreview}
        previewRef={receiptPreviewRef}
        onClose={() => setReceiptModalOpen(false)}
        onPrint={printReceipt}
        onDownloadPdf={downloadReceiptPdf}
      />

      <LastSalesModal
        open={lastSalesModalOpen}
        sales={latestSales}
        onClose={() => setLastSalesModalOpen(false)}
        onLoadSale={loadHistoricalSale}
      />

      <HistoricalSaleCancelModal
        open={historicalCancelConfirmOpen}
        saleId={selectedHistoricalSale?.id ?? null}
        onClose={() => setHistoricalCancelConfirmOpen(false)}
        onConfirm={exitHistoricalSale}
      />
    </>
  );
}

function EmptyProductsState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-muted/30 text-center">
      <Package2 className="h-10 w-10 text-muted-foreground" />
      <p className="text-xl font-medium text-foreground/90">Nenhum produto encontrado</p>
      <p className="max-w-md text-sm text-muted-foreground">Ajuste a busca para localizar itens mockados no estoque local.</p>
    </div>
  );
}

function ReceiptPreviewModal({
  open,
  data,
  previewRef,
  onClose,
  onPrint,
  onDownloadPdf,
}: {
  open: boolean;
  data: ReceiptPreviewData;
  previewRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onReceiptShortcut(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        onDownloadPdf();
        return;
      }

      if (event.key === "F12") {
        event.preventDefault();
        onPrint();
      }
    }

    window.addEventListener("keydown", onReceiptShortcut);
    return () => window.removeEventListener("keydown", onReceiptShortcut);
  }, [onClose, onDownloadPdf, onPrint, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm dark:bg-neutral-950/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[min(88vh,860px)] w-full max-w-5xl flex-col rounded-[1.8rem] border-2 border-slate-300 bg-card p-5 shadow-2xl dark:border-neutral-700 dark:bg-black"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3">Recibo térmico</Badge>
                <h2 className="text-2xl font-semibold text-foreground">Pré-visualização do cupom</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Modelo pronto para impressora térmica, com visual de cupom fiscal e opções para imprimir ou baixar em PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border/70 bg-muted/70 px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-slate-300 bg-background/80 p-4 dark:border-neutral-700 dark:bg-neutral-950">
              <div className="h-full overflow-y-auto pr-2">
                <div ref={previewRef} className="mx-auto w-full max-w-[352px] bg-transparent p-2">
                  <div data-receipt-capture="true" className="rounded-[1.5rem] border border-slate-200 bg-white px-6 py-5 font-mono text-[12px] leading-[1.55] text-slate-900 shadow-xl">
                    <div className="border-b border-dashed border-slate-300 pb-4 text-center">
                      <p className="text-[15px] font-bold uppercase tracking-[0.18em]">{data.company.nome}</p>
                      <p className="mt-2 text-[11px] leading-[1.55]">{data.company.documento}</p>
                      <p className="text-[11px] leading-[1.55]">{data.company.endereco}</p>
                      <p className="text-[11px] leading-[1.55]">{data.company.cidade}</p>
                      <p className="text-[11px] leading-[1.55]">{data.company.telefone}</p>
                    </div>

                    <div className="border-b border-dashed border-slate-300 py-4 text-[11px]">
                      <div className="flex items-center justify-between gap-3">
                        <span>Cupom</span>
                        <span className="font-semibold">{data.saleId}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span>Emissão</span>
                        <span>{data.issuedAt}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span>Operador</span>
                        <span>{data.operatorName}</span>
                      </div>
                      {data.sellerName && data.sellerName !== DEFAULT_SELLER_NAME ? (
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span>Vendedor</span>
                          <span>{data.sellerName}</span>
                        </div>
                      ) : null}
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span>Cliente</span>
                        <span className="inline-block max-w-[165px] truncate pb-[2px] text-right leading-[1.7]">{data.clientName}</span>
                      </div>
                      {data.linkedDocumentCode ? (
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span>Pedido/O.S</span>
                          <span>{data.linkedDocumentCode}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="border-b border-dashed border-slate-300 py-4">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em]">
                        <span>Item</span>
                        <span>Total</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {data.items.map((item) => (
                          <div key={item.id}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate pb-[2px] font-semibold leading-[1.7]">{item.nome}</p>
                                <p className="text-[11px] leading-[1.55] text-slate-900">
                                  {item.quantidade} x {money.format(item.preco)}
                                </p>
                                {item.desconto > 0 ? (
                                  <p className="text-[11px] leading-[1.55] text-slate-500">Desc: -{money.format(item.desconto)}</p>
                                ) : null}
                              </div>
                              <p className="shrink-0 font-semibold leading-[1.5]">{money.format(item.total)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-y border-dashed border-slate-300 py-4 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span>{money.format(data.subtotal)}</span>
                      </div>
                      {data.itemDiscountTotal > 0 ? (
                        <div className="mt-1 flex items-center justify-between">
                          <span>Desc. itens</span>
                          <span>-{money.format(data.itemDiscountTotal)}</span>
                        </div>
                      ) : null}
                      {data.orderDiscount > 0 ? (
                        <div className="mt-1 flex items-center justify-between">
                          <span>Desc. geral</span>
                          <span>-{money.format(data.orderDiscount)}</span>
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-between pt-2 text-[13px] font-bold">
                        <span>Total</span>
                        <span>{money.format(data.total)}</span>
                      </div>
                    </div>

                    <div className="py-4 text-[11px]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em]">Pagamento</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span>Forma</span>
                        <span>{data.paymentMethod}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span>Valor pago</span>
                        <span>{money.format(data.cashReceived)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span>Troco</span>
                        <span>{money.format(data.changeAmount)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        <span>Status</span>
                        <span>{data.paymentMethod === "Dinheiro" ? "Recebido no caixa" : "Pagamento confirmado"}</span>
                      </div>
                    </div>

                    <div className="pt-4 text-center text-[11px] text-slate-900">
                      <p>Obrigado pela preferência.</p>
                      <p className="mt-1">Este cupom não possui valor fiscal.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button variant="ghost" onClick={onClose} className="h-11 rounded-2xl border border-border/70 text-sm dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800">
                <span>Fechar visualizacao</span>
                <span className="ml-2 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200">ESC</span>
              </Button>
              <Button variant="ghost" onClick={onDownloadPdf} className="h-11 rounded-2xl border border-border/70 text-sm dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800">
                <Download className="mr-2 h-4 w-4" />
                <span>Baixar PDF</span>
                <span className="ml-2 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200">F11</span>
              </Button>
              <Button onClick={onPrint} className="h-11 rounded-2xl text-sm font-semibold">
                <Printer className="mr-2 h-4 w-4" />
                <span>Imprimir cupom</span>
                <span className="ml-2 rounded-lg border border-primary-foreground/30 bg-primary-foreground/15 px-2 py-1 text-[11px] font-semibold text-primary-foreground">F12</span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LastSalesModal({
  open,
  sales,
  onClose,
  onLoadSale,
}: {
  open: boolean;
  sales: Sale[];
  onClose: () => void;
  onLoadSale: (sale: Sale) => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function onLastSalesShortcut(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onLastSalesShortcut);
    return () => window.removeEventListener("keydown", onLastSalesShortcut);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm dark:bg-neutral-950/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[min(82vh,760px)] w-full max-w-4xl flex-col rounded-[1.8rem] border-2 border-slate-300 bg-card p-5 shadow-2xl dark:border-neutral-700 dark:bg-none dark:bg-black dark:shadow-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3">Historico</Badge>
                <h2 className="text-2xl font-semibold text-foreground">Ultimas vendas do PDV</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Selecione uma venda para carregar no PDV em modo bloqueado. Nela voce pode apenas cancelar ou imprimir o recibo.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border/70 bg-muted/70 px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-slate-300 bg-background/80 p-4 dark:border-neutral-700 dark:bg-neutral-950">
              <div className="h-full overflow-y-auto pr-1">
              {sales.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-muted/30 text-center dark:border-[#262626] dark:bg-neutral-950">
                  <History className="h-8 w-8 text-muted-foreground" />
                  <p className="text-base font-medium text-foreground/90">Nenhuma venda registrada</p>
                  <p className="max-w-md text-xs text-muted-foreground">Finalize uma venda no PDV para ela aparecer aqui.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sales.slice(0, 20).map((sale) => (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => onLoadSale(sale)}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-white/95 px-4 py-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary/10 dark:border-[#262626] dark:bg-neutral-900 dark:shadow-none dark:hover:bg-neutral-800"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{sale.id}</p>
                          <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
                            {sale.metodoPagamento}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(sale.data).toLocaleString("pt-BR")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {sale.cliente}
                          {sale.vendedor ? ` â€¢ ${sale.vendedor}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{money.format(sale.total)}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{sale.itens.length} item(ns)</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function HistoricalSaleCancelModal({
  open,
  saleId,
  onClose,
  onConfirm,
}: {
  open: boolean;
  saleId: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm dark:bg-neutral-950/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg rounded-[1.8rem] border-2 border-slate-300 bg-card p-6 shadow-2xl dark:border-neutral-700 dark:bg-black"
          >
            <Badge className="mb-3">Confirmacao</Badge>
            <h2 className="text-2xl font-semibold text-foreground">Sair da venda carregada?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A venda {saleId ?? "selecionada"} nao sera alterada no historico. Voce apenas vai sair da visualizacao atual e voltar ao PDV normal.
            </p>

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-2xl border border-border/70 text-sm">
                Continuar vendo
              </Button>
              <Button onClick={onConfirm} className="h-11 flex-1 rounded-2xl text-sm font-semibold">
                Sair da venda
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function HeaderInfo({
  label,
  value,
  shortcut,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  shortcut?: string;
  icon: typeof User;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-[180px] rounded-2xl border px-4 py-2.5 text-left shadow-sm transition hover:border-blue-200 ${
        active
          ? "border-blue-200 bg-white dark:border-primary/25 dark:bg-primary/10 dark:shadow-none"
          : "border-[#E5E7EB] bg-white hover:bg-slate-50 dark:border-[#262626] dark:bg-neutral-900 dark:shadow-none dark:hover:bg-neutral-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border ${
              active
                ? "border-blue-200 bg-white text-blue-700 dark:border-primary/20 dark:bg-primary/10 dark:text-primary"
                : "border-blue-200 bg-white text-blue-700 dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className={`mt-1 text-sm font-semibold ${active ? "text-blue-700 dark:text-primary" : "text-slate-800 dark:text-foreground"}`}>{value}</p>
          </div>
        </div>
        {shortcut ? (
          <span
            className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
              active
                ? "border-blue-200 bg-white text-blue-700 dark:border-primary/20 dark:bg-primary/10 dark:text-primary"
                : "border-blue-200 bg-white text-blue-700 dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-300"
            }`}
          >
            {shortcut}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function PaymentModal({
  open,
  paymentMethod,
  setPaymentMethod,
  cashReceivedInput,
  setCashReceivedInput,
  changeAmount,
  total,
  cardType,
  setCardType,
  installmentsInput,
  setInstallmentsInput,
  onClose,
  onConfirm,
}: {
  open: boolean;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;
  cashReceivedInput: string;
  setCashReceivedInput: (value: string) => void;
  changeAmount: number;
  total: number;
  cardType: CardType;
  setCardType: (value: CardType) => void;
  installmentsInput: string;
  setInstallmentsInput: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const options: Array<{ label: PaymentMethod; displayLabel: string; shortcut: string; icon: typeof Banknote }> = [
    { label: "Dinheiro", displayLabel: "Dinheiro", shortcut: "F1", icon: Banknote },
    { label: "PIX", displayLabel: "PIX", shortcut: "F2", icon: QrCode },
    { label: "Cartao", displayLabel: "CartÃ£o", shortcut: "F3", icon: CreditCard },
  ];

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPaymentShortcut(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "F12") {
        event.preventDefault();
        onConfirm();
        return;
      }

      if (event.key === "F1") {
        event.preventDefault();
        setPaymentMethod("Dinheiro");
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        setPaymentMethod("PIX");
        return;
      }

      if (event.key === "F3") {
        event.preventDefault();
        setPaymentMethod("Cartao");
      }
    }

    window.addEventListener("keydown", onPaymentShortcut);
    return () => window.removeEventListener("keydown", onPaymentShortcut);
  }, [onClose, onConfirm, open, setPaymentMethod]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm dark:bg-neutral-950/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[700px] w-full max-w-4xl flex-col rounded-[2rem] border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-50/70 p-6 shadow-2xl shadow-blue-100/70 dark:border-neutral-700 dark:bg-none dark:bg-black dark:shadow-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3">Pagamento</Badge>
                <h2 className="text-3xl font-semibold text-foreground">Finalizar venda</h2>
                <p className="mt-2 text-base text-muted-foreground">Escolha a forma de pagamento para concluir o cupom fiscal.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-blue-100 bg-white/90 px-3 py-2 text-sm text-blue-700 transition hover:bg-blue-50 dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="flex flex-col gap-3">
              {options.map(({ label, displayLabel, shortcut, icon: Icon }) => {
                const active = paymentMethod === label;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setPaymentMethod(label)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        active
                          ? "border-primary/50 bg-primary/10 dark:bg-blue-500/10"
                          : "border-border/70 bg-muted/40 hover:border-border dark:border-[#262626] dark:bg-neutral-900 dark:hover:bg-neutral-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold text-foreground">{displayLabel}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {label === "PIX" ? "Pagamento instantaneo" : label === "Dinheiro" ? "Recebimento no caixa" : "Credito ou debito"}
                          </p>
                        </div>
                        <span
                          className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                            active
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/70 bg-muted/70 text-muted-foreground"
                          }`}
                        >
                          {shortcut}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="h-full rounded-3xl border border-blue-200 bg-white/85 p-5 shadow-sm shadow-blue-100/50 dark:border-neutral-700 dark:bg-neutral-950 dark:shadow-none">
                {paymentMethod === "PIX" ? (
                  <div className="flex h-full flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pagamento por PIX</p>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Confirmacao imediata do pagamento via chave PIX ou QR Code dinamico no caixa.
                      </p>
                    </div>
                    <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/10 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Status</p>
                      <p className="mt-2 text-lg font-semibold text-primary">Aguardando confirmacao instantanea</p>
                    </div>
                  </div>
                ) : null}

                {paymentMethod === "Dinheiro" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pagamento em dinheiro</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
                      <div>
                        <label className="text-sm text-muted-foreground">Valor recebido</label>
                          <Input
                            inputMode="numeric"
                            value={cashReceivedInput}
                            onChange={(event) => setCashReceivedInput(formatCurrencyInput(event.target.value))}
                            onFocus={(event) => event.currentTarget.select()}
                            className="mt-2 h-12 rounded-2xl border-border/70 bg-muted/70 text-right text-base font-semibold tabular-nums dark:border-[#262626] dark:bg-black dark:text-slate-100"
                          />
                      </div>
                      <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Troco</p>
                        <p className="mt-2 text-2xl font-bold text-primary">{money.format(changeAmount)}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {paymentMethod === "Cartao" ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pagamento no cartÃ£o</p>
                    <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                      <div className="inline-flex rounded-2xl border border-blue-100 bg-blue-50/80 p-1 dark:border-[#262626] dark:bg-neutral-900">
                        {([
                          { value: "Credito", label: "CrÃ©dito" },
                          { value: "Debito", label: "DÃ©bito" },
                        ] as Array<{ value: CardType; label: string }>).map(({ value, label }) => {
                          const active = cardType === value;

                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setCardType(value)}
                              className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium transition ${
                                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {cardType === "Credito" ? (
                        <div className="flex w-full max-w-[220px] items-center gap-3">
                          <label className="shrink-0 text-sm text-muted-foreground">Parcelas</label>
                          <Input
                            inputMode="numeric"
                            value={installmentsInput}
                            onChange={(event) => setInstallmentsInput(sanitizeInstallmentsInput(event.target.value))}
                            onFocus={(event) => event.currentTarget.select()}
                            className="h-12 rounded-2xl border-border/70 bg-muted/70 text-center text-base font-semibold dark:border-[#262626] dark:bg-black dark:text-slate-100"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-100/80 via-blue-50 to-white p-5 shadow-sm shadow-blue-100/60 dark:border-neutral-700 dark:bg-neutral-950 dark:shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-base text-muted-foreground">Total a receber</span>
                <span className="text-3xl font-bold text-primary">{money.format(total)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" onClick={onClose} className="h-14 flex-1 rounded-2xl border border-border/70 text-base">
                <span>Cancelar</span>
                <span className="ml-2 rounded-lg border border-border/70 bg-muted/70 px-2 py-1 text-[11px] font-semibold text-muted-foreground">ESC</span>
              </Button>
              <Button onClick={onConfirm} className="h-14 flex-[1.4] rounded-2xl text-base font-semibold">
                <span>Confirmar pagamento</span>
                <span className="ml-2 rounded-lg border border-primary/20 bg-background/20 px-2 py-1 text-[11px] font-semibold text-foreground">F12</span>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ItemDiscountModal({
  open,
  value,
  onChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm dark:bg-neutral-950/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-[1.75rem] border-2 border-slate-300 bg-card p-5 shadow-2xl dark:border-neutral-700 dark:bg-black"
          >
            <Badge className="mb-3">Desconto do item</Badge>
            <h2 className="text-2xl font-semibold text-foreground">Aplicar desconto</h2>
            <p className="mt-2 text-sm text-muted-foreground">Digite o valor do desconto e pressione Enter para aplicar ao item selecionado.</p>

            <div className="mt-5">
              <Input
                autoFocus
                inputMode="numeric"
                value={value}
                onChange={(event) => onChange(formatCurrencyInput(event.target.value))}
                onFocus={(event) => event.currentTarget.select()}
                className="h-12 rounded-2xl border-slate-300 bg-muted/70 text-right text-base font-semibold tabular-nums dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <Button type="button" variant="ghost" onClick={onClose} className="h-11 flex-1 rounded-2xl border border-border/70 text-sm">
                Cancelar
              </Button>
              <Button type="submit" className="h-11 flex-1 rounded-2xl text-sm font-semibold">
                Aplicar
              </Button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SelectionModal({
  open,
  badge,
  title,
  placeholder,
  items,
  onClose,
  onSelect,
}: {
  open: boolean;
  badge: string;
  title: string;
  placeholder: string;
  items: string[];
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    function onModalShortcut(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const fKeyMatch = /^F([1-5])$/.exec(event.key);
      if (!fKeyMatch) {
        return;
      }

      const selectedIndex = Number(fKeyMatch[1]) - 1;
      const selectedItem = filteredItems[selectedIndex];

      if (!selectedItem) {
        return;
      }

      event.preventDefault();
      onSelect(selectedItem);
    }

    window.addEventListener("keydown", onModalShortcut);
    return () => window.removeEventListener("keydown", onModalShortcut);
  }, [filteredItems, onClose, onSelect, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm dark:bg-neutral-950/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[min(78vh,680px)] w-full max-w-4xl flex-col rounded-[1.8rem] border-2 border-slate-300 bg-card p-5 shadow-2xl dark:border-neutral-700 dark:bg-black"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3">{badge}</Badge>
                <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">Use a busca, clique em um item ou pressione `F1` a `F5` para selecionar.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border/70 bg-muted/70 px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
              <div className="rounded-3xl border border-slate-300 bg-background/80 p-4 dark:border-neutral-700 dark:bg-neutral-950">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={placeholder}
                    className="h-11 rounded-2xl border-slate-300 bg-muted/70 pl-11 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 rounded-3xl border border-slate-300 bg-background/80 p-4 dark:border-neutral-700 dark:bg-neutral-950">
                <div className="h-full overflow-y-auto pr-1">
                  {filteredItems.length === 0 ? (
                    <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 text-center">
                      <Package2 className="h-8 w-8 text-muted-foreground" />
                      <p className="text-base font-medium text-foreground/90">Nenhum item encontrado</p>
                      <p className="text-xs text-muted-foreground">Ajuste a busca para localizar o registro.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map((item, index) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => onSelect(item)}
                          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-muted/40 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-primary/10 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                        >
                          <p className="text-sm font-semibold text-foreground">{item}</p>
                          {index < 5 ? (
                            <span className="rounded-lg border border-slate-300 bg-muted/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground dark:border-neutral-700 dark:bg-neutral-900 dark:text-slate-300">
                              F{index + 1}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LinkDocumentModal({
  open,
  onClose,
  onLink,
}: {
  open: boolean;
  onClose: () => void;
  onLink: (document: LinkableDocument) => void;
}) {
  const [activeTab, setActiveTab] = useState<LinkableDocumentType>("ordem_servico");
  const [search, setSearch] = useState("");

  const activeItems = activeTab === "ordem_servico" ? mockServiceOrders : mockSalesOrders;
  const filteredItems = activeItems.filter((item) => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return true;
    }

    return (
      item.codigo.toLowerCase().includes(normalizedSearch) ||
      item.cliente.toLowerCase().includes(normalizedSearch) ||
      item.descricao.toLowerCase().includes(normalizedSearch)
    );
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function onModalShortcut(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const fKeyMatch = /^F([1-5])$/.exec(event.key);
      if (!fKeyMatch) {
        return;
      }

      const selectedIndex = Number(fKeyMatch[1]) - 1;
      const selectedItem = filteredItems[selectedIndex];

      if (!selectedItem) {
        return;
      }

      event.preventDefault();
      onLink(selectedItem);
    }

    window.addEventListener("keydown", onModalShortcut);
    return () => window.removeEventListener("keydown", onModalShortcut);
  }, [filteredItems, onClose, onLink, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm dark:bg-neutral-950/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[min(82vh,760px)] w-full max-w-5xl flex-col rounded-[1.8rem] border-2 border-slate-300 bg-card p-5 shadow-2xl dark:border-neutral-700 dark:bg-none dark:bg-black dark:shadow-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3">Vínculo comercial</Badge>
                <h2 className="text-2xl font-semibold text-foreground">Pedido de Venda / Ordem de Serviço</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ao vincular um documento, o carrinho passa a aceitar apenas esse item até o vínculo ser removido.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border/70 bg-muted/70 px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent dark:border-[#262626] dark:bg-neutral-900 dark:text-slate-200 dark:hover:bg-neutral-800"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
              <div>
                <div className="inline-flex rounded-2xl border border-slate-300 bg-background/80 p-1 dark:border-neutral-700 dark:bg-neutral-900">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("ordem_servico");
                      setSearch("");
                    }}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
                      activeTab === "ordem_servico" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    <Briefcase className="h-4 w-4" />
                    Ordem de Serviço
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("pedido_venda");
                      setSearch("");
                    }}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition ${
                      activeTab === "pedido_venda" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Pedido de Venda
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1">
                <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-300 bg-background/80 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-950 dark:shadow-none">
                  <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {activeTab === "ordem_servico" ? "Ordens de Serviço" : "Pedidos de Venda"}
                      </p>
                      <p className="text-xs text-muted-foreground">Selecione um item para vincular ao cupom</p>
                    </div>
                    <div className="relative w-full lg:max-w-sm">
                      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={activeTab === "ordem_servico" ? "Buscar ordem de serviço" : "Buscar pedido de venda"}
                        className="h-11 rounded-2xl border-slate-300 bg-muted/70 pl-11 text-sm dark:border-[#262626] dark:bg-black dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {filteredItems.length === 0 ? (
                      <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 text-center dark:border-[#262626] dark:bg-neutral-950">
                        <Package2 className="h-8 w-8 text-muted-foreground" />
                        <p className="text-base font-medium text-foreground/90">Nenhum item encontrado</p>
                        <p className="text-xs text-muted-foreground">Ajuste a busca para localizar o documento.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredItems.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onLink(item)}
                            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-300 bg-white/95 px-4 py-3 text-left shadow-sm transition hover:border-primary/30 hover:bg-primary/10 dark:border-[#262626] dark:bg-neutral-900 dark:shadow-none dark:hover:bg-neutral-800"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{item.codigo}</p>
                                {index < 5 ? (
                                  <span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-300">
                                    F{index + 1}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{item.cliente}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{item.descricao}</p>
                            </div>
                            <p className="text-sm font-bold text-primary">{money.format(item.total)}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function buildReceiptPrintHtml(imageData: string, width: number, height: number) {
  const thermalWidthMm = 80;
  const renderedHeightMm = (height * thermalWidthMm) / width;

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Recibo</title>
      <style>
        @page {
          size: ${thermalWidthMm}mm ${renderedHeightMm}mm;
          margin: 0;
        }
        body {
          margin: 0;
          background: #ffffff;
          color: #111827;
          font-family: "Courier New", monospace;
        }
        .receipt {
          width: ${thermalWidthMm}mm;
          margin: 0 auto;
          padding: 0;
          overflow: hidden;
        }
        img {
          display: block;
          width: ${thermalWidthMm}mm;
          height: auto;
        }
      </style>
    </head>
    <body onload="window.print(); setTimeout(() => window.close(), 150);">
      <div class="receipt">
        <img src="${imageData}" alt="Recibo" />
      </div>
    </body>
  </html>`;
}

function buildReceiptPdf(data: ReceiptPreviewData) {
  const lines = [
    data.company.nome.toUpperCase(),
    data.company.documento,
    data.company.endereco,
    data.company.cidade,
    data.company.telefone,
    "----------------------------------------",
    `Cupom: ${data.saleId}`,
    `Emissão: ${data.issuedAt}`,
    `Operador: ${data.operatorName}`,
    ...(data.sellerName && data.sellerName !== DEFAULT_SELLER_NAME ? [`Vendedor: ${data.sellerName}`] : []),
    `Cliente: ${data.clientName}`,
    ...(data.linkedDocumentCode ? [`Pedido/O.S: ${data.linkedDocumentCode}`] : []),
    "----------------------------------------",
    "ITENS",
    ...data.items.flatMap((item) => {
      const itemLines = [
        item.nome,
        `${item.quantidade} x ${money.format(item.preco)} = ${money.format(item.total)}`,
      ];

      if (item.desconto > 0) {
        itemLines.push(`Desc: -${money.format(item.desconto)}`);
      }

      return itemLines;
    }),
    "----------------------------------------",
    `Subtotal: ${money.format(data.subtotal)}`,
    ...(data.itemDiscountTotal > 0 ? [`Desc. itens: -${money.format(data.itemDiscountTotal)}`] : []),
    ...(data.orderDiscount > 0 ? [`Desc. geral: -${money.format(data.orderDiscount)}`] : []),
    `TOTAL: ${money.format(data.total)}`,
    "----------------------------------------",
    "PAGAMENTO",
    `Forma: ${data.paymentMethod}`,
    `Valor pago: ${money.format(data.cashReceived)}`,
    `Troco: ${money.format(data.changeAmount)}`,
    `Status: ${data.paymentMethod === "Dinheiro" ? "Recebido no caixa" : "Pagamento confirmado"}`,
    "----------------------------------------",
    "Obrigado pela preferência.",
    "Este cupom não possui valor fiscal.",
  ];

  const pdfLines = lines.map((line) => sanitizePdfText(line));
  const maxChars = Math.max(...pdfLines.map((line) => line.length), 32);
  const width = Math.max(226, maxChars * 4.8 + 42);
  const lineHeight = 14;
  const height = 36 + pdfLines.length * lineHeight;

  const content = pdfLines
    .map((line, index) => `BT /F1 9 Tf 16 ${height - 24 - index * lineHeight} Td (${line}) Tj ET`)
    .join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Courier >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadInitialProducts() {
  const existing = readStorage<Product[] | null>(STORAGE_PRODUCTS_KEY, null);

  if (!existing || existing.length === 0) {
    localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(initialProducts));
    return initialProducts;
  }

  return existing;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits === "" ? "0" : digits;
  const amount = Number(normalized) / 100;
  return money.format(amount);
}

function sanitizeInstallmentsInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return "1";
  }

  const normalized = Math.min(Math.max(Number(digits), 1), 20);
  return String(normalized);
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return 0;
  }

  return Number(digits) / 100;
}

