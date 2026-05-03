/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  updateDoc,
  getDocFromServer,
  orderBy,
  limit,
  or,
} from "firebase/firestore";
import { auth, db, OperationType, handleFirestoreError } from "./lib/firebase";

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
import {
  LayoutDashboard,
  Search,
  Briefcase,
  FileLock2,
  MessageSquare,
  Bell,
  User,
  Users,
  Menu,
  X,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  DollarSign,
  PieChart,
  ChevronRight,
  Filter,
  Plus,
  Clock,
  Target,
  FileText,
  Check,
  Send,
  History,
  Handshake,
  ArrowLeft,
  FileUp,
  Download,
  Folder,
  Lock,
  Eye,
  Calendar,
  Video,
  AtSign,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
type View =
  | "landing"
  | "marketplace"
  | "deal-detail"
  | "dashboard"
  | "create-deal"
  | "auth"
  | "admin-dashboard"
  | "profile"
  | "kyc"
  | "my-companies"
  | "create-company"
  | "negotiations"
  | "negotiation-room";
type UserRole = "buyer" | "seller" | "advisor" | "admin";

interface UserData {
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isBanned?: boolean;
  banReason?: string;
}

interface Company {
  id: string;
  ownerId: string;
  legalName: string;
  taxId: string;
  registrationCountry?: string;
  incorporationYear?: number;
  industry: string;
  products?: string;
  targetMarkets?: string;
  founderPct?: number;
  investorPct?: number;
  esopPct?: number;
  isVisible: boolean;
  version: number;
  createdAt: any;
  updatedAt: any;
}

interface Deal {
  id: string;
  title: string;
  industry: string;
  location: string;
  financials: {
    revenue: Record<string, string>;
    ebitda: Record<string, string>;
    netProfit: Record<string, string>;
    growthRate: string;
  };
  dealDetails: {
    dealType: string;
    valuation: string;
    equityOffered: string;
  };
  strategicObjectives: {
    reasonForSelling: string;
    futurePlans: string;
  };
  documents?: {
    pitchDeck: string;
    financialReport: string;
    legalDocs: string;
  };
  valuation?: string;
  type?: string;
  description: string;
  status:
    | "draft"
    | "submitted"
    | "under-review"
    | "approved"
    | "published"
    | "in-negotiation"
    | "closed";
  ownerId?: string;
  ownerName?: string;
  companyId?: string;
  adminComments?: string;
}

interface Negotiation {
  id: string;
  dealId: string;
  dealTitle: string;
  buyerId: string;
  buyerName?: string;
  buyerEmail?: string;
  sellerId: string;
  sellerName?: string;
  sellerEmail?: string;
  status: "active" | "accepted" | "closed" | "legal-process";
  createdAt: any;
  updatedAt: any;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  type: "text" | "system" | "offer" | "file";
  attachmentUrl?: string;
  createdAt: any;
}

interface Offer {
  id: string;
  senderId: string;
  amount: string;
  equityPercent: number;
  terms?: string;
  status: "pending" | "countered" | "accepted" | "rejected";
  createdAt: any;
}

interface LegalDocument {
  id: string;
  type: "NDA" | "LOI" | "SPA";
  status: "draft" | "reviewing" | "pending-signature" | "signed" | "archived" | "void";
  url?: string;
  parties: string[];
  signedBy?: string[];
  createdAt: any;
  updatedAt: any;
}

interface DataRoomFile {
  id: string;
  name: string;
  folder: "Financial" | "Legal" | "HR" | "Contracts" | "Technology";
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  permissions?: {
    canDownload?: boolean;
    canView?: boolean;
  };
  createdAt: any;
}

interface DataRoomTracking {
  id: string;
  userId: string;
  fileId: string;
  fileName: string;
  duration: number;
  accessedAt: any;
}

interface Meeting {
  id: string;
  title: string;
  startTime: any;
  duration: number;
  type: "Video Call" | "Office Meeting";
  link: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  organiserId: string;
  createdAt: any;
}

// --- Mock Data ---
const MOCK_DEALS: Deal[] = [
  {
    id: "1",
    title: "Cổng Thanh toán FinTech - SaaS",
    industry: "Công nghệ Tài chính",
    location: "Singapore",
    financials: {
      revenue: { "2022": "$8.5M", "2023": "$10.2M", "2024": "$12.5M" },
      ebitda: { "2022": "$1.8M", "2023": "$2.2M", "2024": "$2.8M" },
      netProfit: { "2022": "$1.2M", "2023": "$1.5M", "2024": "$1.9M" },
      growthRate: "+45%",
    },
    dealDetails: {
      dealType: "Bán Tài sản",
      valuation: "$45M",
      equityOffered: "100",
    },
    strategicObjectives: {
      reasonForSelling: "Thoái vốn đầu tư.",
      futurePlans: "Mở rộng quốc tế.",
    },
    description:
      "Nền tảng thanh toán hàng đầu chuyên tin về các giao dịch thương mại điện tử xuyên biên giới.",
    status: "published",
  },
  {
    id: "2",
    title: "Sản xuất Thiết bị Y tế Chính xác",
    industry: "Y tế / Sản xuất",
    location: "Đức",
    financials: {
      revenue: { "2022": "$38M", "2023": "$42M", "2024": "$48M" },
      ebitda: { "2022": "$5.5M", "2023": "$6.2M", "2024": "$7.2M" },
      netProfit: { "2022": "$3.8M", "2023": "$4.2M", "2024": "$5.0M" },
      growthRate: "+12%",
    },
    dealDetails: {
      dealType: "Bán Cổ phần",
      valuation: "$75M",
      equityOffered: "49",
    },
    strategicObjectives: {
      reasonForSelling: "Mở rộng quy mô.",
      futurePlans: "Phát triển R&D.",
    },
    description:
      "Nhà cung cấp cấp 1 cho các bộ phận cấy ghép chỉnh hình với các hợp đồng dài hạn.",
    status: "published",
  },
];

// --- Utils ---
const validateEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    );
};

export default function App() {
  const [activeView, setActiveView] = useState<View>("landing");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [myCompanies, setMyCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(
    null,
  );
  const [kycRequest, setKycRequest] = useState<any | null>(null);

  useEffect(() => {
    let unsubscribeCompanies: (() => void) | undefined;
    let unsubscribeKYC: (() => void) | undefined;

    if (user && auth.currentUser) {
      const q = query(
        collection(db, "companies"),
        where("ownerId", "==", auth.currentUser.uid),
      );
      unsubscribeCompanies = onSnapshot(
        q,
        (snapshot) => {
          setMyCompanies(
            snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Company,
            ),
          );
        },
        (error) => {
          console.warn("My companies access error:", error);
        },
      );

      // Track user's KYC request
      const kycQ = query(
        collection(db, "kyc_requests"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(1),
      );
      unsubscribeKYC = onSnapshot(
        kycQ,
        (snapshot) => {
          if (!snapshot.empty) {
            setKycRequest({
              id: snapshot.docs[0].id,
              ...snapshot.docs[0].data(),
            });
          } else {
            setKycRequest(null);
          }
        },
        (error) => {
          // Silently fail or log for KYC tracking
          console.error("KYC Tracking Error:", error);
        },
      );
    } else {
      setMyCompanies([]);
      setKycRequest(null);
    }

    return () => {
      if (unsubscribeCompanies) unsubscribeCompanies();
      if (unsubscribeKYC) unsubscribeKYC();
    };
  }, [user]);

  useEffect(() => {
    // Kiểm tra nếu người dùng đang quay lại từ link email
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt(
          "Vui lòng nhập lại email của bạn để xác nhận đăng nhập:",
        );
      }

      if (email) {
        setIsLoading(true);
        signInWithEmailLink(auth, email, window.location.href)
          .then(async (result) => {
            window.localStorage.removeItem("emailForSignIn");
            const savedRole =
              (window.localStorage.getItem("roleForSignIn") as UserRole) ||
              "buyer";
            window.localStorage.removeItem("roleForSignIn");

            const userRef = doc(db, "users", result.user.uid);
            const userDoc = await getDoc(userRef);

            const isMasterAdmin =
              result.user.email === "tuanminhdang208@gmail.com";

            if (!userDoc.exists()) {
              const newUser: UserData = {
                name: email!.split("@")[0],
                email: email!,
                role: isMasterAdmin ? "admin" : savedRole,
                isVerified: isMasterAdmin ? true : false,
              };
              await setDoc(userRef, {
                ...newUser,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              setUser(newUser);
            } else {
              const data = userDoc.data() as UserData;
              if (isMasterAdmin && data.role !== "admin") {
                await updateDoc(userRef, {
                  role: "admin",
                  isVerified: true,
                  updatedAt: serverTimestamp(),
                });
                data.role = "admin";
                data.isVerified = true;
              }
              setUser(data);
            }
            navigateTo("marketplace");
          })
          .catch((error) => {
            console.error("Lỗi xác thực email link:", error);
            alert("Link xác thực không hợp lệ hoặc đã hết hạn.");
          })
          .finally(() => setIsLoading(false));
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        const path = `users/${firebaseUser.uid}`;
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as UserData);
          } else {
            setUser(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeDeals: (() => void) | undefined;

    if (activeView === "marketplace") {
      try {
        const q = query(
          collection(db, "deals"),
          where("status", "in", ["published", "approved"]),
        );
        unsubscribeDeals = onSnapshot(
          q,
          (snapshot) => {
            const fetchedDeals = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Deal,
            );
            setDeals(fetchedDeals);
          },
          (error) => {
            console.warn("Marketplace deals access error:", error);
            setDeals([]);
          },
        );
      } catch (error) {
        console.error("Error setting up deals snapshot:", error);
      }
    }

    return () => {
      if (unsubscribeDeals) unsubscribeDeals();
    };
  }, [activeView]);

  const navigateTo = (
    view: View,
    deal?: Deal,
    company?: Company,
    negotiation?: Negotiation,
  ) => {
    setActiveView(view);
    if (deal) setSelectedDeal(deal);
    if (company) setSelectedCompany(company);
    if (negotiation) setSelectedNegotiation(negotiation);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleLogin = async (role: UserRole = "buyer") => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userRef = doc(db, "users", firebaseUser.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.GET,
          `users/${firebaseUser.uid}`,
        );
        return;
      }

      if (!userDoc.exists()) {
        const isMasterAdmin =
          firebaseUser.email === "tuanminhdang208@gmail.com";
        const newUser: UserData = {
          name:
            firebaseUser.displayName ||
            firebaseUser.email?.split("@")[0] ||
            "User",
          email: firebaseUser.email || "",
          role: isMasterAdmin ? "admin" : role,
          isVerified: isMasterAdmin ? true : false,
        };
        try {
          await setDoc(userRef, {
            ...newUser,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.WRITE,
            `users/${firebaseUser.uid}`,
          );
          return;
        }
        setUser(newUser);
      } else {
        const data = userDoc.data() as UserData;
        if (
          firebaseUser.email === "tuanminhdang208@gmail.com" &&
          data.role !== "admin"
        ) {
          await updateDoc(userRef, {
            role: "admin",
            isVerified: true,
            updatedAt: serverTimestamp(),
          });
          data.role = "admin";
          data.isVerified = true;
        }
        setUser(data);
      }

      navigateTo("marketplace");
    } catch (error) {
      console.error("Login process error:", error);
      // If we already handled with handleFirestoreError, it will have thrown.
      // Generic catch for popup errors etc.
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigateTo("landing");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Đang khởi tạo Nexus...</p>
        </div>
      </div>
    );
  }

  if (user?.isBanned) {
    return <BannedScreen user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-morphism border-b bg-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigateTo("landing")}
            >
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">
                N
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-slate-900 uppercase">
                Nexus M&A
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => navigateTo("marketplace")}
                className={`text-sm font-medium transition-colors ${activeView === "marketplace" ? "text-brand-600" : "text-slate-600 hover:text-brand-600"}`}
              >
                Sàn giao dịch
              </button>

              {user ? (
                <>
                  <button
                    onClick={() => navigateTo("dashboard")}
                    className={`text-sm font-medium transition-colors ${activeView === "dashboard" ? "text-brand-600" : "text-slate-600 hover:text-brand-600"}`}
                  >
                    {(user.role === "admin" ||
                      user.email === "tuanminhdang208@gmail.com")
                      ? "Quản trị"
                      : "Danh mục của tôi"}
                  </button>
                  <button
                    onClick={() => navigateTo("negotiations")}
                    className={`text-sm font-medium transition-colors ${activeView === "negotiations" ? "text-brand-600" : "text-slate-600 hover:text-brand-600"}`}
                  >
                    Đàm phán
                  </button>
                  {(user.role === "seller" ||
                    user.role === "admin" ||
                    user.email === "tuanminhdang208@gmail.com") && (
                    <button
                      onClick={() => navigateTo("my-companies")}
                      className={`text-sm font-medium transition-colors ${activeView === "my-companies" ? "text-brand-600" : "text-slate-600 hover:text-brand-600"}`}
                    >
                      Doanh nghiệp
                    </button>
                  )}
                  {(user.role === "admin" ||
                    user.email === "tuanminhdang208@gmail.com") && (
                    <button
                      onClick={() => navigateTo("admin-dashboard")}
                      className={`text-sm font-medium transition-colors ${activeView === "admin-dashboard" ? "text-brand-600" : "text-slate-600 hover:text-brand-600"}`}
                    >
                      Hệ thống
                    </button>
                  )}
                  <button className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">
                    Tài nguyên
                  </button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                  </button>
                  <div className="group relative">
                    <button className="flex items-center gap-2 pl-4">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 border border-brand-200">
                        <User size={18} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {user.name}
                      </span>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-2 z-50">
                      <button
                        onClick={() => navigateTo("profile")}
                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Hồ sơ cá nhân
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                        Cài đặt
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      navigateTo("auth");
                    }}
                    className="text-sm font-semibold text-slate-600 hover:text-brand-600"
                  >
                    Đăng nhập
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      navigateTo("auth");
                    }}
                    className="px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-full hover:bg-brand-500 shadow-lg shadow-brand-200 transition-all"
                  >
                    Bắt đầu ngay
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-slate-600"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b"
            >
              <div className="px-4 py-6 space-y-4">
                <button
                  onClick={() => navigateTo("marketplace")}
                  className="block w-full text-left text-lg font-medium text-slate-900 border-b pb-2"
                >
                  Sàn giao dịch Deal
                </button>
                <button
                  onClick={() => navigateTo("dashboard")}
                  className="block w-full text-left text-lg font-medium text-slate-900 border-b pb-2"
                >
                  Bảng điều khiển Nhà đầu tư
                </button>
                <button className="block w-full text-left text-lg font-medium text-slate-900 border-b pb-2">
                  Phòng Dữ liệu
                </button>
                <button className="block w-full text-left text-lg font-medium text-slate-900 border-b pb-2">
                  Tin nhắn
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pt-16">
        <AnimatePresence mode="wait">
          {activeView === "landing" && (
            <LandingView onExplore={() => navigateTo("marketplace")} />
          )}
          {activeView === "marketplace" && (
            <MarketplaceView
              key="marketplace"
              deals={deals.length > 0 ? deals : MOCK_DEALS}
              onSelectDeal={(deal) => navigateTo("deal-detail", deal)}
              onCreateDeal={() => navigateTo("create-deal")}
            />
          )}
          {activeView === "deal-detail" && selectedDeal && (
            <DealDetailView
              key="deal-detail"
              deal={selectedDeal}
              onBack={() => navigateTo("marketplace")}
              user={user}
              onNegotiate={(neg) =>
                navigateTo("negotiation-room", undefined, undefined, neg)
              }
            />
          )}
          {activeView === "dashboard" && (
            <DashboardView
              user={user}
              key="dashboard"
              onManageCompanies={() => navigateTo("my-companies")}
              onCreateDeal={() => navigateTo("create-deal")}
              onSelectDeal={(deal) => navigateTo("deal-detail", deal)}
              onNegotiate={(neg) =>
                navigateTo("negotiation-room", undefined, undefined, neg)
              }
            />
          )}
          {activeView === "my-companies" && (
            <MyCompaniesView
              companies={myCompanies}
              onCreate={() => navigateTo("create-company")}
              onNiemyet={(c) => navigateTo("create-deal", undefined, c)}
              key="my-companies"
            />
          )}
          {activeView === "create-company" && (
            <CreateCompanyFlow
              onCancel={() => navigateTo("my-companies")}
              key="create-company"
            />
          )}
          {activeView === "create-deal" && (
            <CreateDealFlow
              key="create-deal"
              onCancel={() => navigateTo("marketplace")}
              myCompanies={myCompanies}
              initialCompany={selectedCompany}
              user={user}
            />
          )}
          {activeView === "admin-dashboard" && (
            <AdminDashboardView key="admin-dashboard" />
          )}
          {activeView === "profile" && (
            <UserProfileView
              user={user}
              kycRequest={kycRequest}
              onStartKYC={() => navigateTo("kyc")}
              key="profile"
            />
          )}
          {activeView === "kyc" && (
            <KYCView
              user={user}
              onComplete={() => navigateTo("profile")}
              key="kyc"
            />
          )}
          {activeView === "negotiations" && (
            <NegotiationCenterView
              user={user}
              key="negotiation-center"
              onSelect={(neg) =>
                navigateTo("negotiation-room", undefined, undefined, neg)
              }
            />
          )}
          {activeView === "negotiation-room" && selectedNegotiation && (
            <NegotiationRoomView
              user={user!}
              negotiation={selectedNegotiation}
              onBack={() => navigateTo("negotiations")}
            />
          )}
          {activeView === "auth" && (
            <AuthView
              mode={authMode}
              onSwitchMode={(mode) => setAuthMode(mode)}
              onLogin={handleLogin}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">
                N
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-white uppercase">
                Nexus M&A
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Tiêu chuẩn toàn cầu cho các giao dịch doanh nghiệp bảo mật cao và
              khám phá đầu tư định chế.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Sàn giao dịch</h4>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">
                Tất cả Deal
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Bên bán
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Gọi vốn
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Câu chuyện thành công
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Nền tảng</h4>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">
                Tuân thủ & KYC
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Quy tắc Bảo mật
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                API cho Cố vấn
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Khung Pháp lý
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white cursor-pointer transition-colors">
                Trung tâm Trợ giúp
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Điều khoản Dịch vụ
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Chính sách Bảo mật
              </li>
              <li className="hover:text-white cursor-pointer transition-colors">
                Liên hệ Chuyên gia
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center text-xs">
          <p>© 2026 Nexus M&A Global. Bảo lưu mọi quyền.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <span>Bảo mật Cấp Tổ chức</span>
            <span>Chứng nhận ISO 27001</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- View Components ---

// --- Components ---
const BannedScreen = ({
  user,
  onLogout,
}: {
  user: UserData;
  onLogout: () => void;
}) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-red-100 text-center"
    >
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6 shadow-inner">
        <FileLock2 size={40} />
      </div>
      <h2 className="text-2xl font-display font-bold text-slate-900 mb-2 uppercase tracking-tight">
        Tài khoản bị tạm khóa
      </h2>
      <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">
        Tài khoản của bạn đã bị khóa do vi phạm các điều khoản dịch vụ hoặc chính
        sách cộng đồng của Nexus.
      </p>

      <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 mb-8 text-left">
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">
          Lý do từ quản trị viên:
        </p>
        <p className="text-red-700 text-sm font-bold italic leading-relaxed">
          "{user.banReason || "Vi phạm chính sách cộng đồng."}"
        </p>
      </div>

      <button
        onClick={onLogout}
        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-200"
      >
        Đăng xuất
      </button>

      <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        Liên hệ hỗ trợ: support@nexus-ma.com
      </p>
    </motion.div>
  </div>
);

// --- Negotiation Components ---

function NegotiationCenterView({
  user,
  onSelect,
}: {
  user: UserData | null;
  onSelect: (neg: Negotiation) => void;
  key?: string;
}) {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !auth.currentUser) return;

    const q =
      user.role === "admin" &&
      auth.currentUser.email === "tuanminhdang208@gmail.com"
        ? collection(db, "negotiations")
        : query(
            collection(db, "negotiations"),
            or(
              where("buyerId", "==", auth.currentUser.uid),
              where("sellerId", "==", auth.currentUser.uid),
            ),
          );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Negotiation,
        );
        setNegotiations(all);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2 uppercase tracking-tight">
            Trung tâm Đàm phán
          </h1>
          <p className="text-slate-500 font-medium">
            Quản lý các tiến trình M&A đang diễn ra
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
            <ShieldCheck size={18} />
            <span className="text-xs font-black uppercase">Safe Deal Zone</span>
          </div>
        </div>
      </div>

      {negotiations.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <MessageSquare size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            Chưa có cuộc đàm phán nào
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-8">
            Bắt đầu đàm phán bằng cách gửi tin nhắn quan tâm đến các Deal trên
            Sàn giao dịch.
          </p>
          <button className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20">
            Khám phá Deal
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {negotiations.map((neg) => (
            <div
              key={neg.id}
              onClick={() => onSelect(neg)}
              className="bg-white border rounded-3xl p-6 hover:border-brand-500 transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-600">
                  <Handshake size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {neg.dealTitle || "Unnamed Deal"}
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      ĐỐI TÁC:{" "}
                      <span className="text-brand-600">
                        {neg.buyerId === auth.currentUser?.uid
                          ? neg.sellerName || "Người bán"
                          : neg.buyerName || "Người mua"}
                      </span>
                    </p>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      ID:{" "}
                      <span className="text-slate-900">
                        {neg.buyerId === auth.currentUser?.uid
                          ? neg.sellerId.substring(0, 8)
                          : neg.buyerId.substring(0, 8)}
                        ...
                      </span>
                    </p>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      BẮT ĐẦU:{" "}
                      <span className="text-slate-900">
                        {neg.createdAt?.seconds
                          ? new Date(
                              neg.createdAt.seconds * 1000,
                            ).toLocaleDateString("vi-VN")
                          : "Gần đây"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    neg.status === "active"
                      ? "bg-brand-50 text-brand-600"
                      : neg.status === "accepted"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {neg.status === "active"
                    ? "Đang đàm phán"
                    : neg.status === "accepted"
                      ? "Đã chấp thuận"
                      : neg.status === "legal-process"
                        ? "Đang làm thủ tục"
                        : "Đã đóng"}
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-brand-500 transition-all" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NegotiationRoomView({
  user,
  negotiation,
  onBack,
}: {
  user: UserData;
  negotiation: Negotiation;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "chat" | "offers" | "documents" | "dataroom" | "meetings"
  >("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [files, setFiles] = useState<DataRoomFile[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [inputText, setInputText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Subscriptions
  useEffect(() => {
    const msgsQ = query(
      collection(db, "negotiations", negotiation.id, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsubscribeMsgs = onSnapshot(msgsQ, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Message),
      );
    });

    const offersQ = query(
      collection(db, "negotiations", negotiation.id, "offers"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeOffers = onSnapshot(offersQ, (snapshot) => {
      setOffers(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Offer),
      );
    });

    const docsQ = query(
      collection(db, "negotiations", negotiation.id, "documents"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeDocs = onSnapshot(docsQ, (snapshot) => {
      setDocs(
        snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as LegalDocument,
        ),
      );
    });

    const filesQ = query(
      collection(db, "negotiations", negotiation.id, "dataroom"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeFiles = onSnapshot(filesQ, (snapshot) => {
      setFiles(
        snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as DataRoomFile,
        ),
      );
    });

    const meetingsQ = query(
      collection(db, "negotiations", negotiation.id, "meetings"),
      orderBy("startTime", "asc"),
    );
    const unsubscribeMeetings = onSnapshot(meetingsQ, (snapshot) => {
      setMeetings(
        snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Meeting,
        ),
      );
    });

    return () => {
      unsubscribeMsgs();
      unsubscribeOffers();
      unsubscribeDocs();
      unsubscribeFiles();
      unsubscribeMeetings();
    };
  }, [negotiation.id]);

  const handleUpdateDocStatus = async (
    docId: string,
    status: LegalDocument["status"],
  ) => {
    try {
      await updateDoc(
        doc(db, "negotiations", negotiation.id, "documents", docId),
        {
          status,
          updatedAt: serverTimestamp(),
        },
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `negotiations/${negotiation.id}/documents/${docId}`,
      );
    }
  };

  const handleSignDoc = async (docObj: LegalDocument) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    if (docObj.signedBy?.includes(uid)) return;

    const newSignedBy = [...(docObj.signedBy || []), uid];
    const isAllSigned = docObj.parties.every((p) => newSignedBy.includes(p));

    try {
      await updateDoc(
        doc(db, "negotiations", negotiation.id, "documents", docObj.id),
        {
          signedBy: newSignedBy,
          status: isAllSigned ? "signed" : "pending-signature",
          updatedAt: serverTimestamp(),
        },
      );

      if (isAllSigned) {
        await addDoc(
          collection(db, "negotiations", negotiation.id, "messages"),
          {
            senderId: auth.currentUser.uid,
            text: `Tài liệu ${docObj.type} đã được ký bởi tất cả các bên.`,
            type: "system",
            createdAt: serverTimestamp(),
          },
        );
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `negotiations/${negotiation.id}/documents/${docObj.id}`,
      );
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      await addDoc(
        collection(db, "negotiations", negotiation.id, "messages"),
        {
          senderId: auth.currentUser?.uid,
          text: inputText,
          type: "text",
          createdAt: serverTimestamp(),
        },
      );
      setInputText("");
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `negotiations/${negotiation.id}/messages`,
      );
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateOffer = async (amount: string, equity: number) => {
    try {
      const offerData = {
        senderId: auth.currentUser?.uid,
        amount,
        equityPercent: equity,
        status: "pending",
        createdAt: serverTimestamp(),
      };
      await addDoc(
        collection(db, "negotiations", negotiation.id, "offers"),
        offerData,
      );
      // Also add a system message to the chat
      await addDoc(
        collection(db, "negotiations", negotiation.id, "messages"),
        {
          senderId: auth.currentUser?.uid,
          text: `Đã gửi một Offer mới: ${amount} cho ${equity}% cổ phần.`,
          type: "offer",
          createdAt: serverTimestamp(),
        },
      );
      setActiveTab("chat");
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `negotiations/${negotiation.id}/offers`,
      );
    }
  };

  const handleUpdateOfferStatus = async (
    offerId: string,
    status: Offer["status"],
  ) => {
    try {
      await updateDoc(
        doc(db, "negotiations", negotiation.id, "offers", offerId),
        { status },
      );
      // System message
      const statusText =
        status === "accepted"
          ? "đã chấp nhận"
          : status === "rejected"
            ? "đã từ chối"
            : "đã gửi phản hồi cho";
      await addDoc(
        collection(db, "negotiations", negotiation.id, "messages"),
        {
          senderId: auth.currentUser?.uid,
          text: `Đã ${statusText} Offer.`,
          type: "system",
          createdAt: serverTimestamp(),
        },
      );

      if (status === "accepted") {
        await updateDoc(doc(db, "negotiations", negotiation.id), {
          status: "accepted",
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `negotiations/${negotiation.id}/offers/${offerId}`,
      );
    }
  };

  const handleFinalizeDeal = async () => {
    if (!auth.currentUser || negotiation.sellerId !== auth.currentUser.uid) {
      alert("Chỉ người bán mới có quyền chốt Deal.");
      return;
    }

    const acceptedOffer = offers.find(o => o.status === "accepted");
    if (!acceptedOffer) {
      alert("Bạn cần chấp nhận một Offer trước khi chốt Deal.");
      return;
    }

    const isConfirmed = confirm("Bạn có chắc chắn muốn CHỐT DEAL này không? Hành động này sẽ kết thúc các cuộc đàm phán khác cho dự án này và đánh dấu dự án là ĐÃ ĐÓNG.");
    if (!isConfirmed) return;

    try {
      // 1. Close this negotiation
      await updateDoc(doc(db, "negotiations", negotiation.id), {
        status: "closed",
        updatedAt: serverTimestamp()
      });

      // 2. Set the Deal to closed
      await updateDoc(doc(db, "deals", negotiation.dealId), {
        status: "closed",
        updatedAt: serverTimestamp()
      });

      // 3. Add system message
      await addDoc(collection(db, "negotiations", negotiation.id, "messages"), {
        senderId: "system",
        text: "CHÚC MỪNG! Giao dịch đã được chốt thành công. Dự án hiện đã đóng.",
        type: "system",
        createdAt: serverTimestamp()
      });

      // 4. (Optional) Notify other negotiations - for now we'll just allow the seller to manage them
      alert("Giao dịch đã được chốt thành công!");
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `deals/${negotiation.dealId}`);
    }
  };

  const handleGenerateDoc = async (type: "NDA" | "LOI" | "SPA") => {
    try {
      await addDoc(
        collection(db, "negotiations", negotiation.id, "documents"),
        {
          type,
          status: "draft",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          parties: [negotiation.buyerId, negotiation.sellerId],
        },
      );
      await addDoc(
        collection(db, "negotiations", negotiation.id, "messages"),
        {
          senderId: auth.currentUser?.uid,
          text: `Đã khởi tạo tài liệu pháp lý: ${type}.`,
          type: "system",
          createdAt: serverTimestamp(),
        },
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `negotiations/${negotiation.id}/documents`,
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col md:flex-row bg-slate-50">
      {/* Sidebar - Negotiation Info */}
      <div className="w-full md:w-80 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-brand-600 transition-colors mb-6 group"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-1 transition-transform"
            />
            <span className="text-xs font-black uppercase tracking-widest">
              Quay lại
            </span>
          </button>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">
              {negotiation.dealTitle}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
              BÊN MUA: {negotiation.buyerId.substring(0, 8)}...
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mb-4">
              BÊN BÁN: {negotiation.sellerId.substring(0, 8)}...
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-emerald-600 uppercase">
                Phiên đàm phán bảo mật
              </span>
            </div>
          </div>
        </div>

        <div className="flex-grow p-4 space-y-2">
          {[
            { id: "chat", label: "Tin nhắn", icon: MessageSquare },
            { id: "offers", label: "Bản chào (Offer)", icon: DollarSign },
            { id: "documents", label: "Pháp lý", icon: FileText },
            { id: "dataroom", label: "Data Room", icon: Folder },
            { id: "meetings", label: "Họp & Lịch", icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 border-t mt-auto space-y-4">
          {negotiation.sellerId === auth.currentUser?.uid && 
           offers.some(o => o.status === 'accepted') && 
           negotiation.status !== 'closed' && (
            <button
              onClick={handleFinalizeDeal}
              className="w-full py-4 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              Chốt Deal Ngay
            </button>
          )}
          
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-700 uppercase mb-2">
              Hỗ trợ bởi Nexus Admin
            </p>
            <button className="w-full py-2 bg-white text-emerald-700 text-[10px] font-bold uppercase border border-emerald-200 rounded-lg hover:bg-emerald-100">
              Yêu cầu Cố vấn
            </button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-grow flex flex-col bg-white overflow-hidden">
        {activeTab === "chat" && (
          <>
            <div className="flex-grow p-6 overflow-y-auto space-y-6 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div className="max-w-xs">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <MessageSquare size={32} />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">
                      Hãy bắt đầu cuộc hội thoại bằng cách gửi tin nhắn. Cuộc hội
                      thoại được mã hóa đầu cuối.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === auth.currentUser?.uid ? "justify-end" : "justify-start"}`}
                  >
                    {msg.type === "text" ? (
                      <div
                        className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                          msg.senderId === auth.currentUser?.uid
                            ? "bg-brand-600 text-white rounded-br-none"
                            : "bg-slate-100 text-slate-800 rounded-bl-none"
                        }`}
                      >
                        <p>{msg.text}</p>
                        {msg.type === "file" && (
                          <button
                            onClick={() => window.open(msg.attachmentUrl, "_blank")}
                            className="mt-2 flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 rounded-lg text-[10px] font-black uppercase transition-all"
                          >
                            <Download size={12} /> Tải xuống tài liệu
                          </button>
                        )}
                        <p className="text-[8px] opacity-70 mt-1 font-bold">
                          {new Date(
                            msg.createdAt?.seconds * 1000,
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full flex justify-center py-2">
                        <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-full text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                          {msg.type === "offer" ? (
                            <DollarSign size={12} className="text-brand-600" />
                          ) : (
                            <ShieldCheck
                              size={12}
                              className="text-emerald-500"
                            />
                          )}
                          {msg.text}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t bg-slate-50/50">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fileName = prompt("Tên file cần gửi?");
                    if (fileName) {
                      addDoc(
                        collection(
                          db,
                          "negotiations",
                          negotiation.id,
                          "messages",
                        ),
                        {
                          senderId: auth.currentUser?.uid,
                          text: `Đã gửi file: ${fileName}`,
                          type: "file",
                          attachmentUrl: "https://example.com/shared-doc.pdf",
                          createdAt: serverTimestamp(),
                        },
                      );
                    }
                  }}
                  className="p-4 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-brand-600 hover:border-brand-200 transition-all shadow-sm"
                >
                  <Paperclip size={20} />
                </button>
                <div className="relative flex-grow">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setInputText((prev) => prev + "@")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-brand-500 transition-all font-black"
                  >
                    <AtSign size={16} />
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!inputText.trim() || sendingMessage}
                  className="bg-brand-600 text-white p-4 rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === "offers" && (
          <div className="flex-grow p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">
                  Lịch sử Offer
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const amount = prompt("Số tiền (USD)?", "1,000,000");
                      const equity = prompt("Tỷ lệ (%)?", "10");
                      if (amount && equity)
                        handleCreateOffer(amount, parseFloat(equity));
                    }}
                    className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
                  >
                    <Plus size={16} /> Gửi Offer Mới
                  </button>
                </div>
              </div>

              {offers.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed">
                  <DollarSign size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-medium">Chưa có bản chào nào được ghi nhận.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="bg-white border rounded-3xl p-6 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-black text-slate-900">
                            ${parseFloat(offer.amount).toLocaleString()}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="text-brand-600 font-bold">
                            {offer.equityPercent}%
                          </span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          GỬI BỞI:{" "}
                          {offer.senderId === auth.currentUser?.uid
                            ? "BẠN"
                            : "ĐỐI TÁC"}{" "}
                          •{" "}
                          {new Date(
                            offer.createdAt?.seconds * 1000,
                          ).toLocaleDateString("vi-VN")}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            offer.status === "accepted"
                              ? "bg-emerald-50 text-emerald-600"
                              : offer.status === "rejected"
                                ? "bg-red-50 text-red-600"
                                : "bg-brand-50 text-brand-600"
                          }`}
                        >
                          {offer.status === "pending"
                            ? "Đang chờ"
                            : offer.status === "accepted"
                              ? "Đã duyệt"
                              : offer.status === "rejected"
                                ? "Từ chối"
                                : "Đã phản hồi"}
                        </span>

                        {offer.status === "pending" &&
                          offer.senderId !== auth.currentUser?.uid && (
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleUpdateOfferStatus(offer.id, "accepted")
                                }
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleUpdateOfferStatus(offer.id, "rejected")
                                }
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <X size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  const amount = prompt(
                                    "Số tiền Counter-Offer (USD)?",
                                    offer.amount,
                                  );
                                  const equity = prompt(
                                    "Tỷ lệ Counter-Offer (%)?",
                                    offer.equityPercent.toString(),
                                  );
                                  if (amount && equity) {
                                    handleUpdateOfferStatus(
                                      offer.id,
                                      "countered",
                                    );
                                    handleCreateOffer(
                                      amount,
                                      parseFloat(equity),
                                    );
                                  }
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-brand-50 text-brand-600 text-[10px] font-black uppercase rounded-lg hover:bg-brand-100 transition-all"
                              >
                                Counter
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="flex-grow p-8 overflow-y-auto">
             <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-bold uppercase tracking-tight text-slate-900">Pháp lý & Tài liệu</h2>
                <div className="flex gap-2">
                   {['NDA', 'LOI', 'SPA'].map(type => (
                     <button
                      key={type}
                      onClick={() => handleGenerateDoc(type as any)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-brand-500 hover:text-brand-600 transition-all"
                    >
                      + {type}
                    </button>
                   ))}
                </div>
              </div>

              <div className="grid gap-6">
                {docs.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed">
                    <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-medium">Chưa có tài liệu pháp lý nào được khởi tạo.</p>
                  </div>
                ) : (
                  docs.map((docObj) => (
                    <div
                      key={docObj.id}
                      className="bg-white border rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-slate-900">
                              {docObj.type} Agreement
                            </h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                              Mã: {docObj.id.substring(0, 8).toUpperCase()} •
                              Phiên bản 1.0
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              docObj.status === "signed"
                                ? "bg-emerald-50 text-emerald-600"
                                : docObj.status === "pending-signature"
                                  ? "bg-amber-50 text-amber-600"
                                  : docObj.status === "reviewing"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {docObj.status === "signed"
                              ? "Đã ký"
                              : docObj.status === "archived"
                                ? "Đã lưu trữ"
                                : docObj.status === "draft"
                                  ? "Bản nháp"
                                  : docObj.status === "reviewing"
                                    ? "Đang thẩm định"
                                    : docObj.status === "pending-signature"
                                      ? "Chờ ký"
                                      : "Vô hiệu"}
                          </span>
                          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                            {docObj.signedBy?.length || 0}/
                            {docObj.parties?.length || 0} đã ký
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div className="flex gap-2">
                          {docObj.status === "draft" && (
                            <button
                              onClick={() =>
                                handleUpdateDocStatus(docObj.id, "reviewing")
                              }
                              className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all"
                            >
                              Gửi thẩm định
                            </button>
                          )}
                          {docObj.status === "reviewing" && (
                            <button
                              onClick={() =>
                                handleUpdateDocStatus(
                                  docObj.id,
                                  "pending-signature",
                                )
                              }
                              className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all"
                            >
                              Hoàn tất thẩm định
                            </button>
                          )}
                          {docObj.status === "pending-signature" && (
                            <button
                              onClick={() => handleSignDoc(docObj)}
                              disabled={docObj.signedBy?.includes(
                                auth.currentUser?.uid || "",
                              )}
                              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                docObj.signedBy?.includes(
                                  auth.currentUser?.uid || "",
                                )
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-200"
                              }`}
                            >
                              {docObj.signedBy?.includes(
                                auth.currentUser?.uid || "",
                              )
                                ? "Đã ký tên"
                                : "Ký điện tử"}
                            </button>
                          )}
                          {docObj.status === "signed" && (
                            <button
                              onClick={() =>
                                handleUpdateDocStatus(docObj.id, "archived")
                              }
                              className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all"
                            >
                              Lưu trữ
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button className="p-3 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-xl transition-all">
                            <Eye size={20} />
                          </button>
                          <button className="p-3 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-xl transition-all">
                            <Download size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-12 p-6 bg-brand-50 rounded-3xl border border-brand-100 border-dashed">
                 <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-brand-600 flex-shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-brand-900 mb-1">Quy tắc Bảo mật Nexus</h4>
                      <p className="text-xs text-brand-700 leading-relaxed">
                        Tất cả tài liệu được tạo qua Nexus đều tuân thủ các quy định hiện hành về bảo mật thông tin và M&A tại Việt Nam & Quốc tế.
                      </p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dataroom" && (
          <div className="flex-grow p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 uppercase tracking-tight mb-2">
                    Virtual Data Room (VDR)
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">
                    Tài liệu thẩm định (Due Diligence) chuyên sâu
                  </p>
                </div>
                {negotiation.sellerId === auth.currentUser?.uid && (
                  <button
                    onClick={() => {
                      const name = prompt("Tên file?");
                      const folder = prompt(
                        "Thư mục (Financial, Legal, HR, Contracts, Technology)?",
                        "Financial",
                      );
                      if (name && folder) {
                        addDoc(
                          collection(
                            db,
                            "negotiations",
                            negotiation.id,
                            "dataroom",
                          ),
                          {
                            name,
                            folder,
                            url: "https://example.com/file.pdf",
                            size: 1024 * 1024 * Math.random(),
                            type: "application/pdf",
                            uploadedBy: auth.currentUser?.uid,
                            createdAt: serverTimestamp(),
                          },
                        );
                      }
                    }}
                    className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-200"
                  >
                    <FileUp size={18} /> Tải lên tài liệu
                  </button>
                )}
              </div>

              {/* Folder Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                {[
                  "Financial",
                  "Legal",
                  "HR",
                  "Contracts",
                  "Technology",
                ].map((folder) => (
                  <div
                    key={folder}
                    className="bg-white border rounded-2xl p-4 hover:border-brand-500 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:bg-brand-50 transition-all mb-3">
                      <Folder size={20} />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      {folder}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      {files.filter((f) => f.folder === folder).length} files
                    </p>
                  </div>
                ))}
              </div>

              {/* File List */}
              <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="px-8 py-4 bg-slate-50 border-b flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Danh sách tài liệu
                  </span>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Watermark Active
                      </span>
                    </div>
                  </div>
                </div>

                {files.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                      <Folder size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">
                      Chưa có tài liệu nào trong Data Room.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="px-8 py-6 hover:bg-slate-50 transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                              {file.name}
                            </h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black uppercase">
                                {file.folder}
                              </span>
                              <span className="text-[10px] font-black text-slate-300 uppercase">
                                {(file.size / 1024).toFixed(0)} KB
                              </span>
                              <span className="text-[10px] font-black text-slate-300 uppercase">
                                {new Date(
                                  file.createdAt?.seconds * 1000,
                                ).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              // Log access tracking
                              await addDoc(
                                collection(
                                  db,
                                  "negotiations",
                                  negotiation.id,
                                  "tracking",
                                ),
                                {
                                  userId: auth.currentUser?.uid,
                                  fileId: file.id,
                                  fileName: file.name,
                                  duration: Math.floor(Math.random() * 300) + 30, // simulated
                                  accessedAt: serverTimestamp(),
                                },
                              );
                              alert(
                                "Mở file bảo mật (Simulated). Nhật ký truy cập đã được ghi lại.",
                              );
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-brand-50 hover:text-brand-600 transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            <Eye size={16} /> Xem
                          </button>
                          <button className="p-2 text-slate-300 hover:text-slate-600 transition-all">
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit Log / Admin Analytics (Seller only) */}
              {negotiation.sellerId === auth.currentUser?.uid && (
                <div className="mt-12">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">
                    Báo cáo Truy cập (Audit Log)
                  </h3>
                  <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <ShieldCheck className="text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-bold">Giám sát Bảo mật Real-time</h4>
                        <p className="text-[10px] text-white/50 uppercase font-black tracking-tighter">
                          Theo dõi mọi hành vi xem và tải tài liệu của đối tác
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* We'll just show a static placeholder or fetch tracking in a real app */}
                      <div className="flex items-center justify-between py-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-black">
                            JD
                          </div>
                          <div>
                            <p className="text-xs font-bold">Đối tác (Buyer)</p>
                            <p className="text-[8px] text-white/40 uppercase">
                              Vừa xem: Financial_Report_2023.pdf
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black text-brand-400 uppercase">
                          4 phút trước
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-black">
                            JD
                          </div>
                          <div>
                            <p className="text-xs font-bold">Đối tác (Buyer)</p>
                            <p className="text-[8px] text-white/40 uppercase">
                              Thời gian xem trung bình: 12 phút / file
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black text-brand-400 uppercase">
                          Hôm nay
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="flex-grow p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-2xl font-display font-bold text-slate-900 uppercase tracking-tight mb-2">
                    Lịch Họp & Thảo Luận
                  </h2>
                  <p className="text-slate-500 text-sm font-medium">
                    Sắp xếp các buổi họp trực tiếp hoặc trực tuyến
                  </p>
                </div>
                <button
                  onClick={() => {
                    const title = prompt("Chủ đề buổi họp?");
                    const type = prompt("Loại hình (Video Call / Office Meeting)?", "Video Call");
                    if (title) {
                      addDoc(collection(db, "negotiations", negotiation.id, "meetings"), {
                        title,
                        startTime: serverTimestamp(), // In real app, use a picker
                        duration: 60,
                        type: type === "Office Meeting" ? "Office Meeting" : "Video Call",
                        link: type === "Office Meeting" ? "Văn phòng dự án" : "https://meet.google.com/abc-defg-hij",
                        status: "scheduled",
                        organiserId: auth.currentUser?.uid,
                        createdAt: serverTimestamp(),
                      });
                    }
                  }}
                  className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-200"
                >
                  <Plus size={18} /> Đặt lịch họp
                </button>
              </div>

              {meetings.length === 0 ? (
                <div className="py-20 text-center bg-white border rounded-[2.5rem]">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                    <Calendar size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">
                    Chưa có buổi họp nào được lên lịch.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="bg-white border rounded-3xl p-6 hover:border-brand-500 transition-all flex flex-col md:flex-row items-center justify-between gap-6"
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${meeting.type === "Video Call" ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
                          {meeting.type === "Video Call" ? <Video size={28} /> : <Handshake size={28} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${meeting.status === "scheduled" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                              {meeting.status}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {meeting.type}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {meeting.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Calendar size={14} />
                              <span className="text-xs font-medium">
                                {meeting.startTime?.seconds 
                                  ? new Date(meeting.startTime.seconds * 1000).toLocaleString("vi-VN") 
                                  : "Đang cập nhật"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Clock size={14} />
                              <span className="text-xs font-medium">
                                {meeting.duration} phút
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto">
                        {meeting.type === "Video Call" && meeting.status === "scheduled" && (
                          <button 
                            onClick={() => window.open(meeting.link, "_blank")}
                            className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                          >
                            Tham gia họp
                          </button>
                        )}
                        <button className="p-3 text-slate-400 hover:text-red-600 transition-all">
                          <History size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LandingView({ onExplore }: { onExplore: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative"
    >
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 py-24 sm:py-32">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-500 to-indigo-900 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center rounded-full px-4 py-1 text-sm font-medium bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20 mb-6 uppercase tracking-widest leading-none">
                Dòng vốn Deal Cấp Tổ chức
              </span>
              <h1 className="text-4xl font-display font-bold tracking-tight text-white sm:text-6xl mb-6">
                Kết nối. Đánh giá.{" "}
                <span className="text-brand-400">Thâu tóm.</span>
              </h1>
              <p className="text-lg leading-8 text-slate-300 mb-10 max-w-xl mx-auto">
                Nexus là sàn giao dịch cao cấp cho việc mua bán doanh nghiệp bảo
                mật, thâu tóm tài sản và gọi vốn chiến lược. Phòng dữ liệu an
                toàn, KYC đã xác thực và bộ công cụ chốt deal liền mạch.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={onExplore}
                  className="w-full sm:w-auto rounded-full bg-brand-600 px-8 py-4 text-sm font-bold text-white shadow-xl hover:bg-brand-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Khám phá Sàn giao dịch <ArrowUpRight size={18} />
                </button>
                <button className="w-full sm:w-auto rounded-full bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all active:scale-95">
                  Đăng ký Người bán
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <ShieldCheck className="text-brand-600" size={32} />,
                title: "Xác thực Vetted",
                desc: "Mọi người dùng đều vượt qua các đợt kiểm tra KYC/AML nghiêm ngặt. Chỉ các chủ sở hữu và cố vấn được ủy quyền mới có thể truy cập dữ liệu mật.",
              },
              {
                icon: <FileLock2 className="text-brand-600" size={32} />,
                title: "Phòng Dữ liệu Ảo",
                desc: "Môi trường an toàn, mã hóa cho việc thẩm định với theo dõi nâng cao, đóng dấu mờ động và kiểm soát truy cập.",
              },
              {
                icon: <PieChart className="text-brand-600" size={32} />,
                title: "Phân tích Tài chính",
                desc: "So sánh ngay lập tức các deal bằng các chỉ số EBITDA tiêu chuẩn, điểm chuẩn ngành và chấm điểm rủi ro dựa trên AI.",
              },
            ].map((pillar, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center space-y-4"
              >
                <div className="mb-2 p-4 bg-brand-50 rounded-2xl">
                  {pillar.icon}
                </div>
                <h3 className="text-xl font-bold">{pillar.title}</h3>
                <p className="text-slate-500 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function MarketplaceView({
  deals,
  onSelectDeal,
  onCreateDeal,
}: {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
  onCreateDeal: () => void;
  key?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display uppercase tracking-tight">
            Sàn giao dịch
          </h1>
          <p className="text-slate-500">
            Khám phá các cơ hội đầu tư đã được kiểm duyệt và các thương vụ M&A.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Filter size={18} /> Bộ lọc
          </button>
          <button
            onClick={onCreateDeal}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-brand-700 transition-colors"
          >
            <Plus size={18} /> Tạo Niêm yết
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            Tổng Deal Đang Hoạt động
          </p>
          <p className="text-2xl font-bold">{deals.length.toLocaleString()}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            Giá trị Deal TB
          </p>
          <p className="text-2xl font-bold">$12.4M</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            Niêm yết mới (24h)
          </p>
          <p className="text-2xl font-bold text-green-600">+12</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">
            Người mua đã Xác thực
          </p>
          <p className="text-2xl font-bold">8,421</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {deals.map((deal) => (
          <motion.div
            key={deal.id}
            whileHover={{ y: -4 }}
            className="data-card group relative cursor-pointer"
            onClick={() => onSelectDeal(deal)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2">
                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 uppercase tracking-tighter">
                  {deal.industry}
                </span>
                {deal.status === "approved" || deal.status === "published" ? (
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 uppercase tracking-tighter border border-emerald-100">
                    Verified
                  </span>
                ) : null}
              </div>
              <button className="text-slate-300 hover:text-brand-500 transition-colors">
                <ArrowUpRight size={20} />
              </button>
            </div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-brand-600 transition-colors leading-tight">
              {deal.title}
            </h3>
            <p className="text-sm text-slate-500 mb-6 line-clamp-2">
              {deal.description}
            </p>

            <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-100 mb-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Doanh thu
                </p>
                <p className="text-sm font-bold">
                  {deal.financials?.revenue?.["2024"] || deal.valuation || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                  EBITDA
                </p>
                <p className="text-sm font-bold">
                  {deal.financials?.ebitda?.["2024"] || "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                  Định giá
                </p>
                <p className="text-sm font-bold text-brand-600">
                  {deal.dealDetails?.valuation || deal.valuation || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <Building2 size={14} /> {deal.location}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-green-600">
                <TrendingUp size={14} /> Tăng trưởng{" "}
                {deal.financials?.growthRate || "-"}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function DealDetailView({
  deal,
  onBack,
  user,
  onNegotiate,
}: {
  deal: Deal;
  onBack: () => void;
  user: UserData | null;
  onNegotiate: (neg: Negotiation) => void;
  key?: string;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "financials" | "documents" | "negotiations"
  >("overview");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [dealNegotiations, setDealNegotiations] = useState<Negotiation[]>([]);
  const isOwner = user && deal.ownerId === auth.currentUser?.uid;

  useEffect(() => {
    if (!isOwner) return;

    const q = query(
      collection(db, "negotiations"),
      where("dealId", "==", deal.id),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDealNegotiations(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Negotiation),
      );
    });

    return () => unsubscribe();
  }, [deal.id, isOwner]);

  const handleSendInquiry = async () => {
    if (!user || !inquiryMessage || isSendingInquiry) return;
    setIsSendingInquiry(true);
    try {
      await addDoc(collection(db, "inquiries"), {
        dealId: deal.id,
        dealTitle: deal.title,
        buyerId: auth.currentUser?.uid,
        buyerName: user.name,
        buyerEmail: user.email,
        sellerId: deal.ownerId,
        sellerName: deal.ownerName || "Chủ tài sản",
        message: inquiryMessage,
        status: "new",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setInquirySent(true);
      setInquiryMessage("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "inquiries");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  const handleStartNegotiation = async () => {
    if (!user || isSendingInquiry) return;
    setIsSendingInquiry(true);
    try {
      const q = query(
        collection(db, "negotiations"),
        where("dealId", "==", deal.id),
        where("buyerId", "==", auth.currentUser?.uid),
      );
      const snap = await getDocs(q);

      let negId;
      if (!snap.empty) {
        negId = snap.docs[0].id;
      } else {
        const docRef = await addDoc(collection(db, "negotiations"), {
          dealId: deal.id,
          dealTitle: deal.title,
          buyerId: auth.currentUser?.uid,
          buyerName: user.name,
          buyerEmail: user.email,
          sellerId: deal.ownerId,
          sellerName: deal.ownerName || "Chủ tài sản",
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        negId = docRef.id;

        await addDoc(collection(db, "negotiations", negId, "messages"), {
          senderId: auth.currentUser?.uid,
          text: "Tôi quan tâm đến Deal này và muốn bắt đầu đàm phán.",
          type: "text",
          createdAt: serverTimestamp(),
        });
      }

      const negDoc = await getDoc(doc(db, "negotiations", negId));
      onNegotiate({ id: negId, ...negDoc.data() } as Negotiation);
    } catch (error) {
      console.error("Negotiation error:", error);
      // Determine if it was a get or create error for better reporting
      const op = error instanceof Error && error.message.includes("permission") ? OperationType.GET : OperationType.CREATE;
      handleFirestoreError(error, op, "negotiations");
    } finally {
      setIsSendingInquiry(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium mb-6 transition-colors"
      >
        <ChevronRight size={20} className="rotate-180" /> Quay lại Sàn giao dịch
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-widest ${
                  deal.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  deal.status === 'in-negotiation' ? 'bg-amber-100 text-amber-700' :
                  deal.status === 'closed' ? 'bg-slate-100 text-slate-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {deal.status === 'published' ? 'Niêm yết Đang hoạt động' :
                   deal.status === 'in-negotiation' ? 'Đang đàm phán' :
                   deal.status === 'closed' ? 'Đã đóng / Thành công' :
                   'Đang kiểm duyệt'}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-sm text-slate-500 font-medium">
                  {deal.industry}
                </span>
              </div>
              <h1 className="text-4xl font-bold font-display uppercase tracking-tight mb-2">
                {deal.title}
              </h1>
              <p className="flex items-center gap-1 text-slate-500 font-medium whitespace-nowrap">
                <Building2 size={16} /> Trụ sở: {deal.location} | Hình thức:{" "}
                {deal.dealDetails?.dealType || "Liên hệ"}
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-6 py-3 border border-slate-300 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                Lưu lại
              </button>
              {user && user.role === "buyer" && deal.ownerId !== auth.currentUser?.uid && deal.status !== "closed" && (
                <button
                  onClick={handleStartNegotiation}
                  disabled={isSendingInquiry}
                  className="flex-1 md:flex-none px-6 py-3 bg-brand-600 text-white rounded-xl font-bold text-sm hover:bg-brand-700 transition-shadow shadow-lg shadow-brand-200 disabled:opacity-50"
                >
                  {isSendingInquiry ? "Đang xử lý..." : "Bắt đầu Đàm phán"}
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 flex space-x-8 overflow-x-auto scroller-hide">
            {[
              { id: "overview", label: "Tổng quan" },
              { id: "financials", label: "Tài chính" },
              { id: "documents", label: "Tài liệu" },
              ...(isOwner ? [{ id: "negotiations", label: "Đàm phán" }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors relative ${activeTab === tab.id ? "border-brand-600 text-brand-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="py-4">
            {activeTab === "negotiations" && isOwner && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Đang đàm phán với ({dealNegotiations.length}) đối tác</h3>
                </div>
                {dealNegotiations.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed rounded-3xl p-12 text-center">
                    <p className="text-slate-400">Chưa có đối tác nào bắt đầu đàm phán.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {dealNegotiations.map((neg) => (
                      <div
                        key={neg.id}
                        onClick={() => onNegotiate(neg)}
                        className="bg-white border rounded-2xl p-5 hover:border-brand-500 cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                            <User size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{neg.buyerName || "Đối tác tiềm năng"}</p>
                            <p className="text-xs text-slate-500">{neg.buyerEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                            neg.status === 'active' ? 'bg-blue-50 text-blue-600' :
                            neg.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {neg.status}
                          </span>
                          <ChevronRight size={18} className="text-slate-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === "overview" && (
              <div className="space-y-12">
                <section>
                  <h3 className="font-bold text-lg mb-3">
                    Tổng quan Cơ hội (Overview)
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {deal.strategicObjectives?.reasonForSelling ||
                      "Doanh nghiệp đang vận hành ổn định với đội ngũ quản lý tâm huyết. Đây là cơ hội thâu tóm/đầu tư tiềm năng trong ngành."}
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-lg mb-3">
                    Kế hoạch tương lai (Future Plans)
                  </h3>
                  <p className="text-slate-600 leading-relaxed italic border-l-4 border-brand-500 pl-6 bg-slate-50 py-4 rounded-r-xl">
                    "
                    {deal.strategicObjectives?.futurePlans ||
                      "Chưa có kế hoạch chi tiết cập nhật."}
                    "
                  </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-brand-600" /> Cấu
                      trúc Deal
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-600 list-disc pl-4 font-medium">
                      <li>
                        Hình thức:{" "}
                        <span className="text-brand-600 font-black">
                          {deal.dealDetails?.dealType || "N/A"}
                        </span>
                      </li>
                      <li>
                        Tỉ lệ cổ phần chào bán:{" "}
                        <span className="text-brand-600 font-black">
                          {deal.dealDetails?.equityOffered || "0"}%
                        </span>
                      </li>
                      <li>
                        Định giá mục tiêu:{" "}
                        <span className="text-brand-600 font-black">
                          {deal.dealDetails?.valuation ||
                            deal.valuation ||
                            "Liên hệ"}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <PieChart size={18} className="text-brand-600" /> Vị thế
                      Thị trường
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      "Đơn vị đang hoạt động mạnh mẽ tại {deal.location} với tệp
                      khách hàng ổn định và tiềm năng tăng trưởng{" "}
                      {deal.financials?.growthRate || "cao"}."
                    </p>
                  </div>
                </div>

                <section
                  id="inquiry-section"
                  className="bg-slate-900 rounded-3xl p-8 text-white"
                >
                  <div className="max-w-xl">
                    <h3 className="text-2xl font-bold mb-2">
                      Quan tâm đến Deal này?
                    </h3>
                    <p className="text-slate-400 text-sm mb-8">
                      Gửi một tin nhắn ngắn gọn để yêu cầu truy cập phòng dữ
                      liệu hoặc đặt lịch họp với bên bán.
                    </p>

                    {inquirySent ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-2xl text-emerald-400 flex items-center gap-4">
                        <ShieldCheck size={32} />
                        <div>
                          <p className="font-bold">Yêu cầu đã được gửi!</p>
                          <p className="text-xs opacity-70">
                            Bên bán sẽ xem xét và phản hồi sớm nhất có thể.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <textarea
                          value={inquiryMessage}
                          onChange={(e) => setInquiryMessage(e.target.value)}
                          placeholder="Chào bạn, tôi là một nhà đầu tư tổ chức đang quan tâm đến lĩnh vực này. Tôi muốn tìm hiểu kỹ hơn về các chỉ số tài chính..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm h-32 focus:ring-2 focus:ring-brand-500 outline-none transition-all placeholder:text-slate-600"
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <ShieldCheck size={12} /> Thông tin của bạn được bảo
                            mật theo chuẩn ISO 27001
                          </p>
                          <button
                            onClick={handleSendInquiry}
                            disabled={!inquiryMessage || isSendingInquiry}
                            className="px-8 py-3 bg-brand-600 rounded-xl text-sm font-bold shadow-lg hover:bg-brand-500 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isSendingInquiry ? "Đang gửi..." : "Gửi Inquiry"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "financials" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Chỉ số tài chính</th>
                        <th className="px-6 py-4">2022 (Actual)</th>
                        <th className="px-6 py-4">2023 (Actual)</th>
                        <th className="px-6 py-4">2024 (Projected)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        {
                          name: "Revenue (Doanh thu)",
                          v1: deal.financials?.revenue?.["2022"] || "-",
                          v2: deal.financials?.revenue?.["2023"] || "-",
                          v3: deal.financials?.revenue?.["2024"] || "-",
                        },
                        {
                          name: "EBITDA",
                          v1: deal.financials?.ebitda?.["2022"] || "-",
                          v2: deal.financials?.ebitda?.["2023"] || "-",
                          v3: deal.financials?.ebitda?.["2024"] || "-",
                        },
                        {
                          name: "Net Profit (LNST)",
                          v1: deal.financials?.netProfit?.["2022"] || "-",
                          v2: deal.financials?.netProfit?.["2023"] || "-",
                          v3: deal.financials?.netProfit?.["2024"] || "-",
                        },
                      ].map((row, i) => (
                        <tr
                          key={i}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {row.name}
                          </td>
                          <td className="px-6 py-4 font-medium">{row.v1}</td>
                          <td className="px-6 py-4 font-medium">{row.v2}</td>
                          <td className="px-6 py-4 font-bold text-brand-600">
                            {row.v3}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl text-xs text-brand-700 flex items-center gap-2">
                  <ShieldCheck size={16} /> Tỉ lệ tăng trưởng trung bình (CAGR)
                  dự báo:{" "}
                  <span className="font-black italic">
                    {deal.financials?.growthRate || "Chưa cập nhật"}
                  </span>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-4">
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                  <FileLock2
                    size={48}
                    className="mx-auto text-slate-300 mb-4"
                  />
                  <h3 className="font-bold text-lg mb-2">Yêu cầu NDA</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                    Truy cập vào Phòng Dữ liệu Ảo (VDR) yêu cầu Thỏa thuận Bảo
                    mật thông tin (NDA) đã ký và sự chấp thuận của người bán.
                  </p>
                  <button className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all">
                    Ký NDA với Một lần nhấp
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Key Stats & Seller */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
              Tóm tắt Tài chính
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">
                  Định giá Đề xuất
                </p>
                <p className="text-3xl font-display font-bold text-brand-400">
                  {deal.dealDetails?.valuation || deal.valuation || "Liên hệ"}
                </p>
              </div>
              <div className="h-px bg-slate-800"></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">
                    Chào bán %
                  </p>
                  <p className="text-lg font-bold">
                    {deal.dealDetails?.equityOffered || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase font-bold mb-1">
                    Biên EBITDA
                  </p>
                  <p className="text-lg font-bold">22.4%</p>
                </div>
              </div>
              <button className="w-full py-4 bg-brand-600 rounded-2xl font-bold text-sm tracking-wide hover:bg-brand-500 transition-colors shadow-lg shadow-brand-900/50">
                Gửi Thư Ngỏ (LOI) Ràng buộc
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardView({
  user,
  onManageCompanies,
  onCreateDeal,
  onSelectDeal,
  onNegotiate,
}: {
  user: UserData | null;
  onManageCompanies?: () => void;
  onCreateDeal?: () => void;
  onSelectDeal?: (deal: Deal) => void;
  onNegotiate?: (neg: Negotiation) => void;
  key?: string;
}) {
  const [personalDeals, setPersonalDeals] = useState<Deal[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const role = user?.role || "buyer";
  const uid = auth.currentUser?.uid;

  const getStatusLabel = (status: Deal["status"]) => {
    switch (status) {
      case "draft":
        return "Bản nháp";
      case "under-review":
      case "submitted":
        return "Đang kiểm duyệt";
      case "approved":
        return "Đã phê duyệt";
      case "published":
        return "Đang niêm yết";
      case "in-negotiation":
        return "Đang đàm phan";
      case "closed":
        return "Đã kết thúc";
      default:
        return status;
    }
  };

  const getStatusColor = (status: Deal["status"]) => {
    switch (status) {
      case "draft":
        return "text-slate-400";
      case "under-review":
      case "submitted":
        return "text-amber-500";
      case "published":
        return "text-emerald-500";
      case "closed":
        return "text-slate-500";
      default:
        return "text-brand-500";
    }
  };

  const handleSubmitDraft = async (dealId: string) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "deals", dealId), {
        status: "under-review",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deals/${dealId}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!uid || !auth.currentUser || auth.currentUser.uid !== uid) return;

    let unsubscribeDeals: (() => void) | undefined;
    let unsubscribeInquiries: (() => void) | undefined;

    // Fetch personal deals if seller/advisor
    if (role === "seller" || role === "advisor") {
      const q = query(collection(db, "deals"), where("ownerId", "==", uid));
      unsubscribeDeals = onSnapshot(q, (snapshot) => {
        setPersonalDeals(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Deal),
        );
      });
    }

    // Fetch inquiries
    const inquiryQ =
      role === "seller" || role === "advisor"
        ? query(collection(db, "inquiries"), where("sellerId", "==", uid))
        : query(collection(db, "inquiries"), where("buyerId", "==", uid));

    unsubscribeInquiries = onSnapshot(inquiryQ, (snapshot) => {
      setInquiries(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    });

    return () => {
      if (unsubscribeDeals) unsubscribeDeals();
      if (unsubscribeInquiries) unsubscribeInquiries();
    };
  }, [uid, role]);

  useEffect(() => {
    const getStats = () => {
      switch (role) {
        case "seller":
          return [
            {
              label: "Niêm yết của tôi",
              value: personalDeals.length.toString(),
              icon: <Building2 />,
              color: "text-brand-600",
              bg: "bg-brand-50",
            },
            {
              label: "Yêu cầu liên hệ mới",
              value: inquiries
                .filter((i) => i.status === "new")
                .length.toString(),
              icon: <MessageSquare />,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Deal đã đóng",
              value: personalDeals
                .filter((d) => d.status === "closed")
                .length.toString(),
              icon: <ShieldCheck />,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ];
        case "advisor":
          return [
            {
              label: "Dự án gán quyền",
              value: personalDeals.length.toString(),
              icon: <Briefcase />,
              color: "text-brand-600",
              bg: "bg-brand-50",
            },
            {
              label: "Inquiries hỗ trợ",
              value: inquiries.length.toString(),
              icon: <MessageSquare />,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "Review hoàn tất",
              value: personalDeals
                .filter((d) => d.status === "published")
                .length.toString(),
              icon: <ShieldCheck />,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ];
        default: // buyer
          return [
            {
              label: "Deal quan tâm",
              value: inquiries.length.toString(),
              icon: <Briefcase />,
              color: "text-brand-600",
              bg: "bg-brand-50",
            },
            {
              label: "Phản hồi mới",
              value: inquiries
                .filter((i) => i.status === "replied")
                .length.toString(),
              icon: <MessageSquare />,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
            {
              label: "NDA đã ký",
              value: "0",
              icon: <FileLock2 />,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ];
      }
    };
    setStats(getStats());
  }, [personalDeals, inquiries, role]);

  const handleAcceptInquiry = async (item: any) => {
    if (isLoading || !user || !auth.currentUser) return;
    setIsLoading(true);
    try {
      // 1. Check if negotiation already exists
      const q = query(
        collection(db, "negotiations"),
        where("dealId", "==", item.dealId),
        where("buyerId", "==", item.buyerId),
        where("sellerId", "==", item.sellerId),
      );
      const snap = await getDocs(q);

      let negData: Negotiation;

      if (!snap.empty) {
        negData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Negotiation;
      } else {
        // Only seller/advisor can create new negotiation from inquiry
        if (role !== "seller" && role !== "advisor" && role !== "admin") {
          console.log("Buyer clicked on unaccepted inquiry");
          return;
        }

        // 2. Create new negotiation
        const docRef = await addDoc(collection(db, "negotiations"), {
          dealId: item.dealId,
          dealTitle: item.dealTitle,
          buyerId: item.buyerId,
          buyerName: item.buyerName || "Người mua",
          buyerEmail: item.buyerEmail || "",
          sellerId: item.sellerId,
          sellerName: user.name,
          sellerEmail: user.email,
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Add initial system message
        await addDoc(collection(db, "negotiations", docRef.id, "messages"), {
          senderId: "system",
          text: `Phiên đàm phán bắt đầu cho: ${item.dealTitle}. Người bán đã chấp nhận yêu cầu của bạn.`,
          type: "system",
          createdAt: serverTimestamp(),
        });

        const newDoc = await getDoc(docRef);
        negData = { id: docRef.id, ...newDoc.data() } as Negotiation;
      }

      // 3. Update inquiry status if it was new and seller/advisor is accepting
      if (item.status === "new" && (role === "seller" || role === "advisor" || role === "admin")) {
        try {
          await updateDoc(doc(db, "inquiries", item.id), {
            status: "replied",
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `inquiries/${item.id}`);
          return; // Don't proceed if update fails
        }
      }

      // 4. Navigate to negotiation
      if (onNegotiate) {
        onNegotiate(negData);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('{"error"')) {
        throw error;
      }
      console.error("Accept inquiry error:", error);
      const op =
        error instanceof Error && error.message.includes("permission")
          ? OperationType.GET
          : OperationType.CREATE;
      handleFirestoreError(error, op, `negotiations`);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case "seller":
        return "Quản lý Tài sản";
      case "advisor":
        return "Trung tâm Cố vấn";
      case "admin":
        return "Hệ thống Quản trị";
      default:
        return "Hoạt động Danh mục";
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">Đang tải dữ liệu...</div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-display uppercase tracking-tight">
          {getRoleTitle()}
        </h1>
        <div className="flex items-center gap-4">
          {onManageCompanies && (role === "seller" || role === "admin") && (
            <button
              onClick={onManageCompanies}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Building2 size={14} /> Quản lý Doanh nghiệp
            </button>
          )}
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <LayoutDashboard size={18} />{" "}
            {role === "admin"
              ? "Bảng quản trị"
              : role === "advisor"
                ? "Cố vấn Hub"
                : "Investor Hub"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bg} rounded-2xl ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              {stat.label}
            </p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-sm uppercase tracking-widest">
                {role === "buyer"
                  ? "Yêu cầu liên hệ của tôi"
                  : "Inquiries nhận được"}
              </h3>
              <button className="text-xs font-bold text-brand-600 hover:underline">
                Xem Tất cả
              </button>
            </div>
            <div className="divide-y">
              {inquiries.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm italic">
                  Không có tương tác nào.
                </div>
              ) : (
                inquiries.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => handleAcceptInquiry(item)}
                    className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                        {role === "buyer"
                          ? item.sellerId?.charAt(0) || "S"
                          : item.buyerName?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-bold text-sm mb-0.5">
                          {item.dealTitle}
                        </p>
                        {role === "seller" && (
                          <p className="text-[10px] font-bold text-brand-600 uppercase mb-1">
                            Từ: {item.buyerName || "Người quan tâm"}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 line-clamp-1 italic">
                          "{item.message}"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {(role === "seller" || role === "advisor") && item.status === "new" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptInquiry(item);
                          }}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-brand-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                        >
                          {isLoading ? "Đang xử lý..." : "Chấp nhận"}
                        </button>
                      )}
                      <div className="hidden sm:block">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.status === "new" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          {item.status === "new"
                            ? "Mới"
                            : item.status === "replied"
                              ? "Đã phản hồi"
                              : "Đóng"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {item.createdAt?.toDate().toLocaleDateString() ||
                          "Vừa xong"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border rounded-3xl p-6">
            <h3 className="font-bold text-sm uppercase tracking-widest mb-6">
              Trạng thái xác thực
            </h3>
            {user?.isVerified ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl text-emerald-700">
                <ShieldCheck size={20} />
                <p className="text-xs font-bold">
                  Tài khoản Level 2 • Đã xác thực
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl text-amber-700">
                  <ShieldCheck size={20} />
                  <p className="text-xs font-bold">Chưa xác thực danh tính</p>
                </div>
                <p className="text-xs text-slate-400">
                  Nâng cấp tài khoản để truy cập vào data room bảo mật.
                </p>
              </div>
            )}
          </div>

          {(role === "seller" || role === "advisor") && (
            <div className="bg-slate-900 rounded-3xl p-6 text-white">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60">
                Niêm yết của tôi
              </h3>
              <div className="space-y-4">
                {personalDeals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => onSelectDeal?.(deal)}
                    className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <div className="flex flex-col">
                      <p className="text-xs font-bold leading-tight group-hover:text-brand-400 transition-colors">
                        {deal.title}
                      </p>
                      <p
                        className={`text-[9px] font-black uppercase tracking-widest mt-1 ${getStatusColor(deal.status)}`}
                      >
                        {getStatusLabel(deal.status)}
                      </p>
                      {deal.adminComments && (
                        <p className="text-[9px] text-amber-600 font-medium italic mt-1 bg-amber-50 px-2 py-1 rounded-lg">
                          Ghi chú Admin: {deal.adminComments}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {deal.status === "draft" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitDraft(deal.id);
                          }}
                          className="rounded bg-brand-600 px-2 py-1 text-[8px] font-black uppercase hover:bg-brand-500 shadow-sm transition-all"
                        >
                          Gửi duyệt
                        </button>
                      )}
                      <ChevronRight
                        size={14}
                        className="opacity-40 transition-transform group-hover:translate-x-1"
                      />
                    </div>
                  </div>
                ))}
                {onCreateDeal && (
                  <button
                    onClick={onCreateDeal}
                    className="w-full py-3 bg-brand-600 shadow-lg shadow-brand-900/20 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-500 transition-all mt-2 active:scale-95"
                  >
                    + Tạo niêm yết mới
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateDealFlow({
  onCancel,
  myCompanies,
  initialCompany,
  user,
}: {
  onCancel: () => void;
  myCompanies: Company[];
  initialCompany?: Company | null;
  user: UserData | null;
  key?: string;
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    initialCompany?.id || "",
  );

  const [formData, setFormData] = useState({
    title: "",
    industry: initialCompany?.industry || "FinTech / SaaS",
    location: initialCompany?.registrationCountry || "",
    description: "",
    revenue: { "2022": "", "2023": "", "2024": "" },
    ebitda: { "2022": "", "2023": "", "2024": "" },
    netProfit: { "2022": "", "2023": "", "2024": "" },
    growthRate: "",
    dealType: "Bán 100%",
    valuation: "",
    equityOffered: "",
    reasonForSelling: "",
    futurePlans: "",
    pitchDeck: "",
    financialReport: "",
    legalDocs: "",
  });

  useEffect(() => {
    if (initialCompany) {
      setFormData((prev) => ({
        ...prev,
        industry: initialCompany.industry,
        location: initialCompany.registrationCountry || prev.location,
        title: `Phát hành/Thoái vốn: ${initialCompany.legalName}`,
      }));
    }
  }, [initialCompany]);

  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.title.trim())
        newErrors.title = "Tên niêm yết không được để trống";
      if (!formData.location.trim())
        newErrors.location = "Địa bàn không được để trống";
      if (!formData.description.trim())
        newErrors.description = "Vui lòng nhập mô tả ngắn gọn";
    } else if (currentStep === 2) {
      if (!formData.revenue["2023"])
        newErrors.revenue = "Vui lòng nhập doanh thu gần nhất";
    } else if (currentStep === 3) {
      if (!formData.valuation.trim())
        newErrors.valuation = "Vui lòng nhập định giá mong muốn";
    } else if (currentStep === 4) {
      if (!formData.reasonForSelling.trim())
        newErrors.reasonForSelling = "Vui lòng nhập lý do bán/gọi vốn";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleNestedInputChange = (
    category: "revenue" | "ebitda" | "netProfit",
    year: string,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [category]: { ...prev[category], [year]: value },
    }));
    if (category === "revenue" && errors.revenue) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.revenue;
        return next;
      });
    }
  };

  const handleCreateDeal = async (targetStatus: "draft" | "submitted") => {
    if (!auth.currentUser) return;
    if (targetStatus === "submitted" && !validateStep(step)) return;

    setIsSubmitting(true);
    try {
      const dealData = {
        title: formData.title,
        industry: formData.industry,
        location: formData.location,
        description: formData.description,
        financials: {
          revenue: formData.revenue,
          ebitda: formData.ebitda,
          netProfit: formData.netProfit,
          growthRate: formData.growthRate,
        },
        dealDetails: {
          dealType: formData.dealType,
          valuation: formData.valuation,
          equityOffered: Number(formData.equityOffered) || 0,
        },
        strategicObjectives: {
          reasonForSelling: formData.reasonForSelling,
          futurePlans: formData.futurePlans,
        },
        documents: {
          pitchDeck: formData.pitchDeck,
          financialReport: formData.financialReport,
          legalDocs: formData.legalDocs,
        },
        ownerId: auth.currentUser.uid,
        ownerName: user?.name || "Ẩn danh",
        companyId: selectedCompanyId || null,
        status: targetStatus === "submitted" ? "under-review" : "draft",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await addDoc(collection(db, "deals"), dealData);
      onCancel();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "deals");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "Tổng quan", icon: <User size={18} /> },
    { id: 2, label: "Tài chính", icon: <DollarSign size={18} /> },
    { id: 3, label: "Cấu trúc", icon: <Briefcase size={18} /> },
    { id: 4, label: "Chiến lược", icon: <Target size={18} /> },
    { id: 5, label: "Tài liệu", icon: <FileText size={18} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-bold text-slate-900 uppercase tracking-tight mb-2 italic">
          Tạo Niêm yết Nexus
        </h1>
        <p className="text-slate-500 font-medium tracking-wide">
          Xây dựng hồ sơ niêm yết chuyên nghiệp để tiếp cận các nhà đầu tư tổ
          chức.
        </p>
      </div>

      <div className="flex justify-between items-center mb-16 max-w-3xl mx-auto relative px-4 text-sans">
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -translate-y-1/2 z-0"></div>
        <div
          className="absolute top-1/2 left-0 h-[3px] bg-brand-600 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((s) => (
          <div
            key={s.id}
            className="relative z-10 flex flex-col items-center gap-3"
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 ${step === s.id ? "bg-brand-600 text-white shadow-xl shadow-brand-200 scale-110" : step > s.id ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-100 text-slate-400"}`}
            >
              {step > s.id ? <Check size={20} /> : s.icon}
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${step === s.id ? "text-brand-600" : "text-slate-400"}`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-8 text-sans">
          <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
            0{step}
          </span>
          <div className="h-[1px] w-12 bg-slate-100"></div>
          <h2 className="text-xl font-bold font-display tracking-tight text-slate-900 uppercase italic">
            Thông tin {steps[step - 1].label}
          </h2>
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-sans"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Liên kết Doanh nghiệp (Tùy chọn)
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setSelectedCompanyId(cid);
                    const comp = myCompanies.find((c) => c.id === cid);
                    if (comp) {
                      setFormData((prev) => ({
                        ...prev,
                        industry: comp.industry,
                        location: comp.registrationCountry || prev.location,
                        title: `Phát hành/Thoái vốn: ${comp.legalName}`,
                      }));
                    }
                  }}
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-bold appearance-none"
                >
                  <option value="">-- Chọn doanh nghiệp đã xác thực --</option>
                  {myCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} ({c.taxId})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[10px] text-slate-500 italic">
                  * Liên kết giúp tăng mức độ tin cậy và minh bạch của hồ sơ
                  niêm yết.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Tiêu đề Niêm yết
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className={`w-full bg-slate-50/50 border ${errors.title ? "border-red-500" : "border-slate-100"} rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-bold transition-all placeholder:text-slate-300`}
                  placeholder="VD: Thoái vốn 100% doanh nghiệp Logistic Top 5 Việt Nam"
                />
                {errors.title && (
                  <p className="text-red-500 text-[10px] font-bold mt-2 uppercase italic">
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Mô tả ngắn gọn
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className={`w-full bg-slate-50/50 border ${errors.description ? "border-red-500" : "border-slate-100"} rounded-2xl px-5 py-4 h-24 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-medium transition-all placeholder:text-slate-300 resize-none`}
                  placeholder="Giới thiệu khái quát về deal này trong 2-3 câu..."
                />
                {errors.description && (
                  <p className="text-red-500 text-[10px] font-bold mt-2 uppercase italic">
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Ngành nghề chủ đạo
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) =>
                    handleInputChange("industry", e.target.value)
                  }
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-bold"
                >
                  <option>Sản xuất / Phân phối</option>
                  <option>Thương mại điện tử</option>
                  <option>FinTech / SaaS</option>
                  <option>Y tế / BioTech</option>
                  <option>Logistics / Chuỗi cung ứng</option>
                  <option>Năng lượng / Green Tech</option>
                  <option>F&B / Hospitality</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Địa bàn hoạt động
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className={`w-full bg-slate-50/50 border ${errors.location ? "border-red-500" : "border-slate-100"} rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 font-bold transition-all placeholder:text-slate-300`}
                  placeholder="VD: Hà Nội, TP.HCM, Singapore..."
                />
                {errors.location && (
                  <p className="text-red-500 text-[10px] font-bold mt-2 uppercase italic">
                    {errors.location}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-4 pt-10 border-t border-slate-50">
              <button
                onClick={onCancel}
                className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]"
              >
                Tiếp tục: Tài chính
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10 text-sans"
          >
            <div className="bg-slate-50/30 p-8 rounded-3xl border border-slate-100">
              <div className="grid grid-cols-4 gap-6 mb-6">
                <div className="col-span-1"></div>
                {["2022", "2023", "2024 (Dự kiến)"].map((year) => (
                  <div
                    key={year}
                    className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest"
                  >
                    {year}
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                {[
                  { label: "Doanh thu (Revenue)", key: "revenue" as const },
                  { label: "EBITDA", key: "ebitda" as const },
                  { label: "Lợi nhuận sau thuế", key: "netProfit" as const },
                ].map((row) => (
                  <div key={row.key}>
                    <div className="grid grid-cols-4 gap-6 items-center">
                      <div className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                        {row.label}
                      </div>
                      {["2022", "2023", "2024"].map((year) => (
                        <input
                          key={year}
                          type="text"
                          value={
                            formData[row.key][year as "2022" | "2023" | "2024"]
                          }
                          onChange={(e) =>
                            handleNestedInputChange(row.key, year, e.target.value)
                          }
                          className="w-full bg-white border border-slate-100 rounded-xl p-3 text-sm text-center font-bold focus:ring-2 focus:ring-brand-500 outline-none"
                          placeholder="0"
                        />
                      ))}
                    </div>
                    {row.key === "revenue" && errors.revenue && (
                      <div className="flex justify-end mt-1">
                        <p className="text-red-500 text-[10px] font-bold uppercase italic pr-4">
                          {errors.revenue}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Tỉ lệ tăng trưởng trung bình (Growth Rate %)
              </label>
              <div className="relative">
                <TrendingUp
                  className="absolute left-4 top-4 text-emerald-500"
                  size={18}
                />
                <input
                  type="text"
                  value={formData.growthRate}
                  onChange={(e) =>
                    handleInputChange("growthRate", e.target.value)
                  }
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 font-black text-emerald-600"
                  placeholder="VD: 35% mỗi năm"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-10 border-t border-slate-50">
              <button
                onClick={() => setStep(1)}
                className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]"
              >
                Tiếp tục: Hình thức M&A
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-sans"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Hình thức chuyển nhượng (Deal Type)
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {["Bán 100%", "Bán cổ phần", "Gọi vốn"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        handleInputChange("dealType", type);
                        if (type === "Bán 100%") {
                          handleInputChange("equityOffered", "100");
                        }
                      }}
                      className={`py-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${formData.dealType === type ? "border-brand-600 bg-brand-50 text-brand-600" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Định giá kỳ vọng (Valuation)
                </label>
                <div className="relative">
                  <DollarSign
                    className="absolute left-4 top-4 text-brand-500"
                    size={18}
                  />
                  <input
                    type="text"
                    value={formData.valuation}
                    onChange={(e) =>
                      handleInputChange("valuation", e.target.value)
                    }
                    className={`w-full bg-slate-50/50 border ${errors.valuation ? "border-red-500" : "border-slate-100"} rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 font-bold text-brand-600`}
                    placeholder="$ 5,000,000"
                  />
                </div>
                {errors.valuation && (
                  <p className="text-red-500 text-[10px] font-bold mt-2 uppercase italic">
                    {errors.valuation}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Tỉ lệ cổ phần chào bán (%)
                </label>
                <div className="relative">
                  <PieChart
                    className="absolute left-4 top-4 text-slate-400"
                    size={18}
                  />
                  <input
                    type="number"
                    value={formData.equityOffered}
                    onChange={(e) =>
                      handleInputChange("equityOffered", e.target.value)
                    }
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:ring-4 focus:ring-brand-500/10 font-black"
                    placeholder="VD: 30"
                  />
                  <span className="absolute right-4 top-4 font-black text-slate-300">
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-10 border-t border-slate-50">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]"
              >
                Tiếp tục: Chiến lược
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-sans"
          >
            <div className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Lý do chào bán / Gọi vốn (Reason for selling)
                </label>
                <textarea
                  value={formData.reasonForSelling}
                  onChange={(e) =>
                    handleInputChange("reasonForSelling", e.target.value)
                  }
                  className={`w-full bg-slate-50/50 border ${errors.reasonForSelling ? "border-red-500" : "border-slate-100"} rounded-3xl px-6 py-5 h-40 outline-none focus:ring-4 focus:ring-brand-500/10 font-medium placeholder:text-slate-300 resize-none`}
                  placeholder="Chia sẻ lý do chủ sở hữu muốn thoái vốn hoặc kêu gọi đầu tư (e.g., Mở rộng quy mô, Nghỉ hưu, Chuyển hướng kinh doanh...)"
                ></textarea>
                {errors.reasonForSelling && (
                  <p className="text-red-500 text-[10px] font-bold mt-2 uppercase italic">
                    {errors.reasonForSelling}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Kế hoạch phát triển tương lai (Future Plans)
                </label>
                <textarea
                  value={formData.futurePlans}
                  onChange={(e) =>
                    handleInputChange("futurePlans", e.target.value)
                  }
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-3xl px-6 py-5 h-40 outline-none focus:ring-4 focus:ring-brand-500/10 font-medium placeholder:text-slate-300 resize-none"
                  placeholder="Định hướng phát triển sau khi có đối tác chiến lược hoặc dòng vốn mới..."
                ></textarea>
              </div>
            </div>

            <div className="flex gap-4 pt-10 border-t border-slate-50">
              <button
                onClick={() => setStep(3)}
                className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Quay lại
              </button>
              <button
                onClick={nextStep}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-[0.98]"
              >
                Tiếp tục: Tài liệu
              </button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10 text-sans"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  label: "Pitch Deck / Teaser",
                  key: "pitchDeck" as const,
                  icon: <FileText size={24} />,
                },
                {
                  label: "Báo cáo Tài chính",
                  key: "financialReport" as const,
                  icon: <DollarSign size={24} />,
                },
                {
                  label: "Hồ sơ Pháp lý",
                  key: "legalDocs" as const,
                  icon: <ShieldCheck size={24} />,
                },
              ].map((doc) => (
                <div
                  key={doc.key}
                  className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50 group hover:border-brand-500 hover:bg-white transition-all cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-brand-600 shadow-sm transition-colors">
                    {doc.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 group-hover:text-slate-900 transition-colors">
                      {doc.label}
                    </p>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">
                      PDF, Word, Excel (Tối đa 50MB)
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-brand-50 p-6 rounded-2xl border border-brand-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-600 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-brand-900 uppercase mb-1">
                  Bảo mật thông tin (NDA)
                </h4>
                <p className="text-[10px] text-brand-700 leading-normal font-medium italic">
                  Nexus cam kết bảo vệ dữ liệu nhạy cảm. Các tài liệu này chỉ
                  hiển thị cho nhà đầu tư tiềm năng sau khi được bạn chấp thuận
                  NDA và xác thực KYC Level 3.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-50">
              <button
                onClick={() => setStep(4)}
                className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all font-sans"
              >
                Quay lại
              </button>
              <button
                onClick={() => handleCreateDeal("draft")}
                className="px-8 py-4 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all font-sans"
              >
                Lưu bản nháp
              </button>
              <button
                onClick={() => handleCreateDeal("submitted")}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-500 transition-all shadow-xl shadow-brand-100 active:scale-[0.98] disabled:opacity-50 font-sans"
              >
                {isSubmitting ? "Đang xử lý..." : "Gửi yêu cầu niêm yết"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AuthView({
  mode,
  onSwitchMode,
  onLogin,
}: {
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
  onLogin: (role: UserRole) => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>("buyer");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || isSubmitting) return;

    if (!validateEmail(email)) {
      setError("Địa chỉ email không hợp lệ");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      // Đảm bảo URL quay lại trỏ chính xác về ứng dụng đang chạy
      const actionCodeSettings = {
        url: window.location.href, // Sử dụng URL hiện tại đầy đủ
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // Lưu lại email và role để dùng sau khi người dùng click link
      window.localStorage.setItem("emailForSignIn", email);
      window.localStorage.setItem("roleForSignIn", selectedRole);

      setIsSent(true);
    } catch (error) {
      console.error("Error sending sign in link:", error);
      alert(
        "Không thể gửi email. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 text-center">
          {isSent ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6"
            >
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 mx-auto mb-6">
                <Bell size={32} className="animate-bounce" />
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 uppercase tracking-tight mb-2">
                Kiểm tra Email
              </h2>
              <p className="text-slate-500 text-sm mb-8 px-4">
                Chúng tôi đã gửi một liên kết xác thực đến{" "}
                <strong>{email}</strong>. Vui lòng nhấn vào link trong email để
                đăng nhập.
              </p>
              <button
                onClick={() => setIsSent(false)}
                className="text-sm font-bold text-brand-600 hover:underline"
              >
                Thay đổi email khác
              </button>
            </motion.div>
          ) : (
            <>
              <h2 className="text-3xl font-display font-bold text-slate-900 uppercase tracking-tight mb-2">
                {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
              </h2>
              <p className="text-slate-500 text-sm mb-8">
                {mode === "login"
                  ? "Truy cập vào các deal M&A độc quyền ngay hôm nay."
                  : "Bắt đầu hành trình M&A của bạn với Nexus."}
              </p>
              <div className="mb-8 text-left">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                  Tôi tham gia với tư cách:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: "buyer",
                      label: "Nhà đầu tư",
                      icon: <Search size={16} />,
                    },
                    {
                      id: "seller",
                      label: "Người bán",
                      icon: <Building2 size={16} />,
                    },
                    {
                      id: "advisor",
                      label: "Cố vấn M&A",
                      icon: <Briefcase size={16} />,
                    },
                    {
                      id: "admin",
                      label: "Quản trị viên",
                      icon: <ShieldCheck size={16} />,
                    },
                  ].map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id as UserRole)}
                      className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-xs font-bold transition-all ${selectedRole === role.id ? "bg-brand-50 border-brand-200 text-brand-600 ring-2 ring-brand-100" : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200"}`}
                    >
                      {role.icon} {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onLogin(selectedRole)}
                className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-brand-500 transition-all shadow-lg shadow-brand-200 active:scale-95 mb-6"
              >
                <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
                  <span className="text-[10px] font-black text-brand-600">
                    G
                  </span>
                </div>
                Tiếp tục với Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-300 tracking-widest">
                  <span className="bg-white px-2">Hoặc dùng Email</span>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="Email công việc"
                  className={`w-full bg-slate-50 border ${error ? "border-red-500" : "border-slate-200"} rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium`}
                />
                {error && (
                  <p className="text-red-500 text-[10px] font-bold mt-1 uppercase italic">
                    {error}
                  </p>
                )}
                <button
                  onClick={handleEmailAuth}
                  disabled={!email || isSubmitting}
                  className="w-full py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Đang gửi..." : "Gửi link xác thực"}
                </button>
              </div>

              <div className="mt-8 text-center text-xs">
                <p className="text-slate-500">
                  {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
                  <button
                    onClick={() =>
                      onSwitchMode(mode === "login" ? "register" : "login")
                    }
                    className="ml-2 font-bold text-brand-600 hover:underline"
                  >
                    {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function UserProfileView({
  user,
  kycRequest,
  onStartKYC,
}: {
  user: UserData | null;
  kycRequest?: any;
  onStartKYC: () => void;
  key?: string;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleRoleUpdate = async (newRole: UserRole) => {
    if (newRole === user.role || isUpdating) return;
    if (!user.isVerified) {
      alert("Vui lòng hoàn thành xác thực KYC Level 2 để thay đổi vai trò.");
      return;
    }

    setIsUpdating(true);
    setSuccess(false);
    try {
      await updateDoc(doc(db, "users", auth.currentUser!.uid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `users/${auth.currentUser?.uid}`,
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12"
    >
      <div className="bg-white border rounded-3xl shadow-xl overflow-hidden">
        <div className="h-32 bg-brand-600 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-3xl bg-brand-100 border-4 border-white flex items-center justify-center text-brand-600 shadow-lg font-bold text-3xl">
              {user.name.charAt(0)}
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold font-display uppercase tracking-tight">
                {user.name}
              </h1>
              <p className="text-slate-500">{user.email}</p>
            </div>
            <div className="flex gap-2">
              {!user.isVerified && !kycRequest && (
                <button
                  onClick={onStartKYC}
                  className="px-6 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-500 transition-all"
                >
                  Bắt đầu KYC
                </button>
              )}
              {kycRequest?.status === "pending" && (
                <div className="px-6 py-2 bg-brand-50 text-brand-600 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Clock size={16} /> CHỜ XÉT DUYỆT
                </div>
              )}
              <button className="px-6 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                Lưu thay đổi
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Họ và tên
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                  defaultValue={user.name}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Quốc gia
                </label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium">
                  <option>Việt Nam</option>
                  <option>Singapore</option>
                  <option>Hoa Kỳ</option>
                  <option>Hồng Kông</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Loại User (Quyền hạn)
                </label>
                <div className="space-y-3">
                  {[
                    {
                      id: "buyer",
                      label: "Buyer (Nhà đầu tư)",
                      desc: "Xem & Đánh giá Deal",
                    },
                    {
                      id: "seller",
                      label: "Seller (Bên bán)",
                      desc: "Tạo & Quản lý Deal",
                    },
                    {
                      id: "advisor",
                      label: "Advisor (Cố vấn)",
                      desc: "Tham gia hỗ trợ chuyên môn",
                    },
                  ].map((role) => (
                    <label
                      key={role.id}
                      onClick={() => handleRoleUpdate(role.id as UserRole)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${user.role === role.id ? "border-brand-600 bg-brand-50/50" : "border-slate-100 hover:border-slate-200"} ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        checked={user.role === role.id}
                        readOnly
                        className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <p
                          className={`text-xs font-bold uppercase tracking-wider ${user.role === role.id ? "text-brand-600" : "text-slate-600"}`}
                        >
                          {role.label}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {role.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                  {success && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-bold text-emerald-600 uppercase italic"
                    >
                      Cập nhật vai trò thành công!
                    </motion.p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <h3 className="font-bold text-sm uppercase tracking-widest mb-4">
              Trạng thái xác thực
            </h3>
            {user.isVerified ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700">
                <ShieldCheck size={20} />
                <span className="text-sm font-bold">
                  Tài khoản đã xác thực KYC (Level 2)
                </span>
              </div>
            ) : kycRequest?.status === "pending" ? (
              <div className="flex items-center gap-3 p-4 bg-brand-50 border border-brand-100 rounded-2xl text-brand-700">
                <Clock size={20} className="text-brand-500" />
                <div>
                  <p className="text-sm font-bold">
                    Đang chờ xét duyệt (Pending Review)
                  </p>
                  <p className="text-[10px] opacity-80">
                    Yêu cầu xác thực của bạn đang được Admin xét duyệt. Vui lòng
                    kiên nhẫn.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} className="text-amber-500" />
                  <div>
                    <p className="text-sm font-bold">Chưa xác thực KYC</p>
                    <p className="text-[10px] opacity-80">
                      Cần xác minh để xem deal private hoặc đăng bài.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onStartKYC}
                  className="text-xs font-bold underline"
                >
                  Xác minh ngay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KYCView({
  user,
  onComplete,
}: {
  user: UserData | null;
  onComplete: () => void;
  key?: string;
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareholders, setShareholders] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    if (step === 3 && !shareholders.trim()) {
      setError("Vui lòng liệt kê danh sách cổ đông");
      return;
    }
    setIsSubmitting(true);
    try {
      const path = "kyc_requests";
      await addDoc(collection(db, path), {
        userId: auth.currentUser?.uid,
        userName: user.name,
        userType: user.role,
        shareholders: shareholders,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "kyc_requests");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-bold text-slate-900 uppercase tracking-tight mb-2">
          Xác minh KYC & Doanh nghiệp
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto">
          Nexus yêu cầu xác minh danh tính cấp độ tổ chức để bảo đảm tính bảo
          mật cho mọi giao dịch.
        </p>
      </div>

      {/* Steps Progress */}
      <div className="flex justify-center items-center gap-4 mb-12">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step === i ? "bg-brand-600 text-white scale-110 shadow-lg" : step > i ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}
            >
              {step > i ? <ShieldCheck size={20} /> : i}
            </div>
            {i < 3 && (
              <div
                className={`w-16 h-1 rounded-full ${step > i ? "bg-emerald-500" : "bg-slate-100"}`}
              ></div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-3xl shadow-xl overflow-hidden p-8">
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Xác minh Cá nhân</h2>
                <p className="text-sm text-slate-500">
                  Tải lên giấy tờ tùy thân hợp lệ (CCCD hoặc Passport).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-4 hover:border-brand-400 transition-all cursor-pointer">
                <Plus size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Mặt trước CCCD
                </p>
              </div>
              <div className="p-12 border-2 border-dashed border-slate-200 rounded-3xl text-center space-y-4 hover:border-brand-400 transition-all cursor-pointer">
                <Plus size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Mặt sau CCCD
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold">
                Hủy bỏ
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-500"
              >
                Tiếp theo: Face Verify
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8 text-center"
          >
            <div className="w-48 h-48 rounded-full bg-slate-900 mx-auto relative overflow-hidden border-4 border-brand-500 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
              <User size={64} className="text-white opacity-20" />
              <div className="absolute bottom-4 bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                Scanning...
              </div>
            </div>

            <div className="max-w-sm mx-auto">
              <h2 className="text-xl font-bold mb-2">Xác thực Khuôn mặt</h2>
              <p className="text-sm text-slate-500">
                Vui lòng quay mặt sang trái, sang phải và nhìn thẳng vào camera
                để hệ thống đối chiếu với CCCD.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold"
              >
                Quay lại
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-200"
              >
                Tiếp theo: Doanh nghiệp
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                <Building2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Xác minh Doanh nghiệp</h2>
                <p className="text-sm text-slate-500">
                  Cung cấp thông tin pháp lý để kích hoạt quyền đăng tin hoặc
                  thâu tóm.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Giấy phép kinh doanh (GPKD)
                </label>
                <div className="p-6 border border-slate-200 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-400">
                      <FileLock2 size={20} />
                    </div>
                    <p className="text-xs font-bold">Chưa tải lên tập tin</p>
                  </div>
                  <button className="text-xs font-bold text-brand-600 hover:underline">
                    Chọn File
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Danh sách Cổ đông chính (Trên 5%)
                </label>
                <textarea
                  value={shareholders}
                  onChange={(e) => {
                    setShareholders(e.target.value);
                    setError("");
                  }}
                  className={`w-full bg-slate-50 border ${error ? "border-red-500" : "border-slate-200"} rounded-2xl p-4 text-sm font-medium h-24 outline-none focus:ring-2 focus:ring-brand-500`}
                  placeholder="Liệt kê tên và tỷ lệ sở hữu..."
                ></textarea>
                {error && (
                  <p className="text-red-500 text-[10px] font-bold mt-1 uppercase italic">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold"
              >
                Quay lại
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Đang gửi..." : "Gửi duyệt tài liệu"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function MyCompaniesView({
  companies,
  onCreate,
  onNiemyet,
}: {
  companies: Company[];
  onCreate: () => void;
  onNiemyet: (company: Company) => void;
  key?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display uppercase tracking-tight">
            Hệ thống Doanh nghiệp
          </h1>
          <p className="text-slate-500">
            Quản lý hồ sơ pháp nhân và cấu trúc sở hữu của bạn.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus size={18} /> Thêm Doanh nghiệp
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {companies.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white border border-dashed rounded-3xl">
            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">
              Bạn chưa đăng ký doanh nghiệp nào.
            </p>
            <button
              onClick={onCreate}
              className="mt-4 text-brand-600 font-bold hover:underline"
            >
              Tạo hồ sơ đầu tiên ngay
            </button>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xl uppercase">
                    {company.legalName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {company.legalName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Mã số thuế: {company.taxId}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${company.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {company.isVisible ? "Công khai" : "Riêng tư"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-t border-slate-100 mb-6 font-sans">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Founder
                  </p>
                  <p className="text-sm font-bold text-brand-600">
                    {company.founderPct}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    Investor
                  </p>
                  <p className="text-sm font-bold text-emerald-600">
                    {company.investorPct}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                    ESOP
                  </p>
                  <p className="text-sm font-bold text-amber-600">
                    {company.esopPct}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                  <Building2 size={14} /> {company.registrationCountry} •{" "}
                  {company.incorporationYear}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onNiemyet(company)}
                    className="text-xs font-bold bg-brand-50 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Niêm yết Deal
                  </button>
                  <button className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
                    Chi tiết <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function CreateCompanyFlow({
  onCancel,
}: {
  onCancel: () => void;
  key?: string;
}) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    legalName: "",
    taxId: "",
    registrationCountry: "Việt Nam",
    incorporationYear: new Date().getFullYear(),
    industry: "FinTech / SaaS",
    products: "",
    targetMarkets: "",
    founderPct: 100,
    investorPct: 0,
    esopPct: 0,
    isVisible: true,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.legalName.trim())
      newErrors.legalName = "Tên pháp nhân không được để trống";
    if (!formData.taxId.trim())
      newErrors.taxId = "Mã số thuế không được để trống";
    if (
      formData.incorporationYear < 1900 ||
      formData.incorporationYear > new Date().getFullYear()
    ) {
      newErrors.incorporationYear = "Năm thành lập không hợp lệ";
    }

    const totalPct =
      formData.founderPct + formData.investorPct + formData.esopPct;
    if (totalPct !== 100) {
      newErrors.ownership = `Tổng tỷ lệ sở hữu phải bằng 100% (Hiện tại: ${totalPct}%)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!auth.currentUser) return;
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "companies"), {
        ...formData,
        ownerId: auth.currentUser.uid,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onCancel();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "companies");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-display font-bold text-slate-900 uppercase tracking-tight mb-2">
          Thêm Doanh nghiệp
        </h1>
        <p className="text-slate-500">
          Xác thực pháp nhân để bắt đầu các giao dịch thâu tóm hoặc gọi vốn.
        </p>
      </div>

      <div className="bg-white border rounded-3xl p-8 shadow-xl space-y-8">
        <section className="space-y-6">
          <h2 className="text-xl font-bold border-b pb-2 uppercase tracking-tight font-display">
            1. Thông tin pháp lý
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Tên pháp nhân đầy đủ
              </label>
              <input
                type="text"
                value={formData.legalName}
                onChange={(e) => handleInputChange("legalName", e.target.value)}
                className={`w-full bg-slate-50 border ${errors.legalName ? "border-red-500" : "border-slate-200"} rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium`}
                placeholder="Công ty Cổ phần Nexus M&A Việt Nam"
              />
              {errors.legalName && (
                <p className="text-red-500 text-[10px] font-bold mt-1 uppercase italic">
                  {errors.legalName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Mã số thuế (Tax ID)
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleInputChange("taxId", e.target.value)}
                className={`w-full bg-slate-50 border ${errors.taxId ? "border-red-500" : "border-slate-200"} rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium`}
                placeholder="0101234567"
              />
              {errors.taxId && (
                <p className="text-red-500 text-[10px] font-bold mt-1 uppercase italic">
                  {errors.taxId}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Năm thành lập
              </label>
              <input
                type="number"
                value={formData.incorporationYear || ""}
                onChange={(e) =>
                  handleInputChange(
                    "incorporationYear",
                    parseInt(e.target.value) || 0,
                  )
                }
                className={`w-full bg-slate-50 border ${errors.incorporationYear ? "border-red-500" : "border-slate-200"} rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium`}
              />
              {errors.incorporationYear && (
                <p className="text-red-500 text-[10px] font-bold mt-1 uppercase italic">
                  {errors.incorporationYear}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold border-b pb-2 uppercase tracking-tight font-display">
            2. Thông tin vận hành
          </h2>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Ngành nghề (Taxonomy)
              </label>
              <select
                value={formData.industry}
                onChange={(e) => handleInputChange("industry", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              >
                <option>FinTech / SaaS</option>
                <option>E-commerce / Retail</option>
                <option>Healthcare / BioTech</option>
                <option>Real Estate / PropTech</option>
                <option>Manufacturing / Logicstics</option>
                <option>Education / EdTech</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Sản phẩm / Dịch vụ chính
              </label>
              <textarea
                value={formData.products}
                onChange={(e) => handleInputChange("products", e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium h-24"
                placeholder="Mô tả các sản phẩm hoặc dịch vụ cốt lõi..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Thị trường mục tiêu
              </label>
              <input
                type="text"
                value={formData.targetMarkets}
                onChange={(e) =>
                  handleInputChange("targetMarkets", e.target.value)
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                placeholder="VN, Đông Nam Á, Toàn cầu..."
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold border-b pb-2 uppercase tracking-tight font-display">
            3. Cơ cấu sở hữu (%)
          </h2>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Founder
              </label>
              <input
                type="number"
                value={formData.founderPct || 0}
                onChange={(e) =>
                  handleInputChange("founderPct", parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-center font-bold text-brand-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Investor
              </label>
              <input
                type="number"
                value={formData.investorPct || 0}
                onChange={(e) =>
                  handleInputChange(
                    "investorPct",
                    parseInt(e.target.value) || 0,
                  )
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-center font-bold text-emerald-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                ESOP
              </label>
              <input
                type="number"
                value={formData.esopPct || 0}
                onChange={(e) =>
                  handleInputChange("esopPct", parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-center font-bold text-amber-600"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-4 bg-brand-50 rounded-xl text-brand-700 text-[10px] font-bold uppercase tracking-widest italic">
            <ShieldCheck size={16} /> Chúng tôi khuyến nghị cập nhật cấu trúc sở
            hữu chính xác để tăng độ tin cậy với nhà đầu tư.
          </div>
          {errors.ownership && (
            <p className="text-red-500 text-[10px] font-bold mt-1 uppercase italic text-center">
              {errors.ownership}
            </p>
          )}
        </section>

        <div className="flex gap-4 pt-8 border-t">
          <button
            onClick={onCancel}
            className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl shadow-brand-100 hover:bg-brand-500 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? "Đang tạo..." : "Lưu Hồ sơ Công ty"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminDashboardView() {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "users" | "deals" | "kyc" | "companies"
  >("analytics");
  const [pendingDeals, setPendingDeals] = useState<Deal[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [kycRequests, setKycRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[] & { id: string }[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [banModal, setBanModal] = useState<{ userId: string; show: boolean }>({
    userId: "",
    show: false,
  });
  const [banReasonInput, setBanReasonInput] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    // 1. Pending Deals
    const pendingQ = query(
      collection(db, "deals"),
      where("status", "==", "under-review"),
    );
    const unsubscribePending = onSnapshot(
      pendingQ,
      (snapshot) => {
        setPendingDeals(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Deal),
        );
      },
      (error) => {
        console.warn("Admin: Pending deals access error", error);
      },
    );

    // 2. All Deals
    const allDealsQ = query(
      collection(db, "deals"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeAllDeals = onSnapshot(
      allDealsQ,
      (snapshot) => {
        setAllDeals(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Deal),
        );
      },
      (error) => {
        console.warn("Admin: All deals access error", error);
      },
    );

    // 3. KYC Requests
    const kycQ = query(
      collection(db, "kyc_requests"),
      where("status", "==", "pending"),
    );
    const unsubscribeKYC = onSnapshot(
      kycQ,
      (snapshot) => {
        setKycRequests(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      },
      (error) => {
        console.warn("Admin: KYC access error", error);
      },
    );

    // 4. All Users
    const usersQ = query(collection(db, "users"), orderBy("name", "asc"));
    const unsubscribeUsers = onSnapshot(
      usersQ,
      (snapshot) => {
        setAllUsers(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as any),
        );
        setIsLoading(false);
      },
      (error) => {
        console.warn("Admin: Users access error", error);
        setIsLoading(false);
      },
    );

    // 5. All Companies
    const companiesQ = query(
      collection(db, "companies"),
      orderBy("createdAt", "desc"),
    );
    const unsubscribeCompanies = onSnapshot(
      companiesQ,
      (snapshot) => {
        setAllCompanies(
          snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Company,
          ),
        );
      },
      (error) => {
        console.warn("Admin: Companies access error", error);
      },
    );

    return () => {
      unsubscribePending();
      unsubscribeAllDeals();
      unsubscribeKYC();
      unsubscribeUsers();
      unsubscribeCompanies();
    };
  }, []);

  const handleUpdateDealStatus = async (
    dealId: string,
    status: Deal["status"],
    comments?: string,
  ) => {
    setIsProcessing(dealId);
    try {
      const updates: any = {
        status,
        updatedAt: serverTimestamp(),
      };
      if (comments !== undefined) {
        updates.adminComments = comments;
      }
      await updateDoc(doc(db, "deals", dealId), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `deals/${dealId}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateKYCStatus = async (
    requestId: string,
    status: "approved" | "rejected",
  ) => {
    setIsProcessing(requestId);
    try {
      await updateDoc(doc(db, "kyc_requests", requestId), {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `kyc/${requestId}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleApproveKYC = async (requestId: string, userId: string) => {
    setIsProcessing(requestId);
    try {
      await handleUpdateKYCStatus(requestId, "approved");
      await updateDoc(doc(db, "users", userId), {
        isVerified: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleUserBan = async (
    userId: string,
    currentBanStatus: boolean,
  ) => {
    if (!currentBanStatus) {
      setBanModal({ userId, show: true });
      setBanReasonInput("Vi phạm chính sách cộng đồng.");
      return;
    }

    setIsProcessing(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        isBanned: false,
        banReason: "",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const confirmBan = async () => {
    const { userId } = banModal;
    if (!userId) return;

    setIsProcessing(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        isBanned: true,
        banReason: banReasonInput || "Vi phạm chính sách cộng đồng.",
        updatedAt: serverTimestamp(),
      });
      setBanModal({ userId: "", show: false });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePromoteToAdmin = async (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setIsProcessing(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        role: "admin",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const calculateStats = () => {
    const totalValuation = allDeals
      .filter((d) => d.status === "published")
      .reduce((sum, d) => {
        // Trích xuất số từ chuỗi như "$1.2M" hoặc "500,000"
        const valStr = d.valuation?.replace(/[^0-9.]/g, "") || "0";
        const val = parseFloat(valStr);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

    return {
      totalDeals: allDeals.length,
      publishedDeals: allDeals.filter((d) => d.status === "published").length,
      totalUsers: allUsers.length,
      totalValuation: totalValuation.toLocaleString(undefined, {
        maximumFractionDigits: 1,
      }),
    };
  };

  const [searchQuery, setSearchQuery] = useState("");
  const filteredUsers = allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const stats = calculateStats();

  if (isLoading)
    return (
      <div className="p-12 text-center text-slate-400">
        Đang chuẩn bị bảng điều khiển...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display uppercase tracking-tight">
            Trung tâm Điều hành
          </h1>
          <p className="text-slate-500 text-sm">
            Quản lý thị trường, thẩm định người dùng và phân tích dữ liệu.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          {[
            {
              id: "analytics",
              label: "Thống kê",
              icon: <PieChart size={14} />,
            },
            { id: "users", label: "Người dùng", icon: <User size={14} /> },
            {
              id: "companies",
              label: "Doanh nghiệp",
              icon: <Building2 size={14} />,
            },
            {
              id: "deals",
              label: "Kiểm duyệt Deal",
              icon: <Filter size={14} />,
            },
            {
              id: "kyc",
              label: "Xác minh KYC",
              icon: <ShieldCheck size={14} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "analytics" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border p-6 rounded-3xl shadow-sm">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                <Building2 size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Tổng Deal Niêm yết
              </p>
              <h4 className="text-2xl font-bold">{stats.totalDeals}</h4>
            </div>
            <div className="bg-white border p-6 rounded-3xl shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
                <ShieldCheck size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Deal Đang hoạt động
              </p>
              <h4 className="text-2xl font-bold">{stats.publishedDeals}</h4>
            </div>
            <div className="bg-white border p-6 rounded-3xl shadow-sm">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 mb-4">
                <Users size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Tổng Người dùng
              </p>
              <h4 className="text-2xl font-bold">{stats.totalUsers}</h4>
            </div>
            <div className="bg-white border p-6 rounded-3xl shadow-sm">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white mb-4">
                <DollarSign size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Giá trị Ước tính (Triệu $)
              </p>
              <h4 className="text-2xl font-bold">${stats.totalValuation}M</h4>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-12 text-center text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl font-display font-bold mb-4">
                Tầm nhìn Thị trường
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto mb-8 font-medium">
                {" "}
                Nexus đang vận hành với hiệu suất 99.9% uptime. Tất cả các giao
                dịch đang được giám sát bởi hệ thống AI an ninh.
              </p>
              <div className="flex justify-center gap-4">
                <div className="px-6 py-3 bg-white/10 rounded-2xl border border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Database Stable
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full"></div>
          </div>
        </motion.div>
      )}

      {activeTab === "users" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border rounded-3xl overflow-hidden"
        >
          <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 gap-4">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-900">
                Danh sách Người dùng ({allUsers.length})
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Quản lý quyền truy cập và xác thực
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm tên hoặc email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Họ tên / Email</th>
                  <th className="px-6 py-4">Vai trò</th>
                  <th className="px-6 py-4 text-center">Xác minh</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-slate-400 text-sm italic"
                    >
                      Không tìm thấy người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50 transition-all group ${u.isBanned ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-slate-900">
                          {u.name}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        {u.isBanned && (
                          <div className="mt-2 text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded inline-block font-bold">
                            Lý do: {u.banReason || "N/A"}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.isVerified && u.role !== "admin" ? (
                          <select
                            value={u.role}
                            onChange={(e) => {
                              setIsProcessing(u.id);
                              updateDoc(doc(db, "users", u.id), {
                                role: e.target.value as any,
                                updatedAt: serverTimestamp(),
                              }).finally(() => setIsProcessing(null));
                            }}
                            disabled={isProcessing === u.id}
                            className="cursor-pointer border-none bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 outline-none focus:ring-1 focus:ring-brand-500 rounded"
                          >
                            <option value="buyer">Investor</option>
                            <option value="seller">Founder</option>
                            <option value="advisor">Advisor</option>
                          </select>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase text-slate-600">
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.isVerified ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                            <ShieldCheck size={14} /> VERIFIED
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-slate-200"></div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {u.role !== "admin" && (
                            <>
                              <button
                                onClick={(e) => handlePromoteToAdmin(e, u.id)}
                                disabled={isProcessing === u.id}
                                className="px-4 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-100 transition-all disabled:opacity-50"
                              >
                                {isProcessing === u.id
                                  ? "Đang xử lý"
                                  : "Cấp Admin"}
                              </button>
                              <button
                                onClick={() =>
                                  handleToggleUserBan(u.id, !!u.isBanned)
                                }
                                disabled={isProcessing === u.id}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${u.isBanned ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                              >
                                {isProcessing === u.id
                                  ? "..."
                                  : u.isBanned
                                    ? "Gỡ Khóa"
                                    : "Khóa"}
                              </button>
                            </>
                          )}
                          {u.role === "admin" && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1.5">
                              Administrator
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === "companies" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white border rounded-3xl overflow-hidden"
        >
          <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-900">
              Tất cả Doanh nghiệp ({allCompanies.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Pháp nhân / MST</th>
                  <th className="px-6 py-4">Ngành nghề</th>
                  <th className="px-6 py-4">Sở hữu (F/I/E)</th>
                  <th className="px-6 py-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allCompanies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-slate-400 text-sm italic"
                    >
                      Chưa có doanh nghiệp nào được đăng ký.
                    </td>
                  </tr>
                ) : (
                  allCompanies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm text-slate-900">
                          {c.legalName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {c.taxId}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600">
                          {c.industry}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold text-brand-600">
                            {c.founderPct}%
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            {c.investorPct}%
                          </span>
                          <span className="text-[10px] font-bold text-amber-600">
                            {c.esopPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest ${c.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {c.isVisible ? "Công khai" : "Riêng tư"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === "deals" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b flex justify-between items-center bg-brand-50/50">
                <h3 className="font-bold text-sm uppercase tracking-widest text-brand-700">
                  Đang chờ Duyệt ({pendingDeals.length})
                </h3>
              </div>
              <div className="divide-y">
                {pendingDeals.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-sm italic">
                    Sạch bóng deal chờ duyệt.
                  </div>
                ) : (
                  pendingDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-5 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase text-xs">
                          {deal.industry.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{deal.title}</p>
                          <p className="text-xs text-slate-500">
                            {deal.industry} • {deal.valuation}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-center gap-2">
                          <select
                            value={deal.status}
                            onChange={(e) =>
                              handleUpdateDealStatus(
                                deal.id,
                                e.target.value as Deal["status"]
                              )
                            }
                            disabled={!!isProcessing}
                            className="rounded-lg border-none bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest outline-none"
                          >
                            <option value="draft">Bản nháp</option>
                            <option value="submitted">Gửi duyệt</option>
                            <option value="under-review">Đang duyệt</option>
                            <option value="approved">Duyệt</option>
                            <option value="published">Niêm yết</option>
                            <option value="in-negotiation">Đàm phán</option>
                            <option value="closed">Đóng</option>
                          </select>
                          <button
                            onClick={() =>
                              handleUpdateDealStatus(deal.id, "closed")
                            }
                            disabled={!!isProcessing}
                            className="p-1 text-slate-300 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          defaultValue={deal.adminComments || ""}
                          placeholder="Ghi chú admin..."
                          onBlur={(e) => {
                            if (e.target.value !== (deal.adminComments || "")) {
                              handleUpdateDealStatus(
                                deal.id,
                                deal.status,
                                e.target.value
                              );
                            }
                          }}
                          className="text-[8px] bg-slate-50 border-none px-2 py-1 rounded w-32 outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
              <div className="p-5 border-b flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-sm uppercase tracking-widest">
                  Tất cả Deal hiện có
                </h3>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {allDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-5 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full ${deal.status === "published" ? "bg-emerald-500" : deal.status === "under-review" ? "bg-amber-500" : "bg-slate-300"}`}
                      ></div>
                      <div>
                        <p className="font-bold text-sm">{deal.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                          {deal.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <select
                        value={deal.status}
                        onChange={(e) =>
                          handleUpdateDealStatus(
                            deal.id,
                            e.target.value as Deal["status"]
                          )
                        }
                        disabled={!!isProcessing}
                        className="rounded-lg border-none bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest outline-none"
                      >
                        <option value="draft">Bản nháp</option>
                        <option value="submitted">Gửi duyệt</option>
                        <option value="under-review">Đang duyệt</option>
                        <option value="approved">Duyệt</option>
                        <option value="published">Niêm yết</option>
                        <option value="in-negotiation">Đàm phán</option>
                        <option value="closed">Đóng</option>
                      </select>
                      <input
                        type="text"
                        defaultValue={deal.adminComments || ""}
                        placeholder="Ghi chú admin..."
                        onBlur={(e) => {
                          if (e.target.value !== (deal.adminComments || "")) {
                            handleUpdateDealStatus(
                              deal.id,
                              deal.status,
                              e.target.value
                            );
                          }
                        }}
                        className="text-[8px] bg-slate-50 border-none px-2 py-1 rounded w-32 outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === "kyc" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b flex justify-between items-center bg-amber-50/10">
              <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-500" />
                Yêu cầu Xác minh ({kycRequests.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {kycRequests.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-sm italic">
                  Không có yêu cầu xác minh nào đang chờ xử lý.
                </div>
              ) : (
                kycRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-8 transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-xl shadow-inner uppercase">
                          {request.userName?.charAt(0)}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-lg text-slate-900">
                            {request.userName}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                              {request.userType === "buyer"
                                ? "Investor"
                                : request.userType === "seller"
                                  ? "Founder"
                                  : "Advisor"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Gửi lúc:{" "}
                              {request.createdAt
                                ?.toDate()
                                .toLocaleString("vi-VN")}
                            </span>
                          </div>

                          {request.shareholders && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">
                                Danh sách cổ đông:
                              </p>
                              <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap">
                                {request.shareholders}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end lg:self-start">
                        <button
                          onClick={() =>
                            handleUpdateKYCStatus(request.id, "rejected")
                          }
                          disabled={!!isProcessing}
                          className="px-4 py-2 text-red-600 text-xs font-bold uppercase tracking-widest hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() =>
                            handleApproveKYC(request.id, request.userId)
                          }
                          disabled={!!isProcessing}
                          className="px-6 py-2 bg-brand-600 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-brand-100 hover:bg-brand-500 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        >
                          {isProcessing === request.id
                            ? "Đang xử lý..."
                            : "Phê duyệt (KYC Level 2)"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}

      {banModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100"
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <FileLock2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 uppercase tracking-tight">
              Xác nhận khóa
            </h3>
            <p className="text-slate-500 text-xs text-center mb-6 leading-relaxed text-sans">
              Vui lòng nhập lý do khóa tài khoản này. Người dùng sẽ thấy lý do
              này khi đăng nhập.
            </p>

            <textarea
              value={banReasonInput}
              onChange={(e) => setBanReasonInput(e.target.value)}
              placeholder="Lý do khóa..."
              className="w-full p-4 bg-slate-50 rounded-xl border-none text-sm mb-6 focus:ring-2 focus:ring-red-500 outline-none min-h-[100px] resize-none font-sans"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBanModal({ userId: "", show: false })}
                className="py-3 px-4 bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors font-sans"
              >
                Hủy
              </button>
              <button
                onClick={confirmBan}
                disabled={!!isProcessing}
                className="py-3 px-4 bg-red-600 rounded-xl text-xs font-bold uppercase tracking-widest text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-100 disabled:opacity-50 font-sans"
              >
                {isProcessing === banModal.userId ? "..." : "Xác nhận khóa"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
