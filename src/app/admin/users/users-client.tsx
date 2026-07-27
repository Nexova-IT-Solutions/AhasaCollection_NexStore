"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, X, Users, Trash2, Edit,
  MoreVertical, UserCheck, UserMinus, ShieldAlert,
  Loader2, Mail, Calendar as LucideCalendar, Shield, MapPin, UserCog,
  Ban, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PERMISSION_TREE_STRUCTURE } from "@/lib/permissions";
import { ImageUpload } from "@/components/ui/image-upload";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

type UserData = {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  role: string;
  privileges: string[];
  templateId: string | null;
  template?: { name: string } | null;
  customPermissions?: any;
  phoneNumber: string | null;
  comments: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  loginStartTime: string | null;
  loginEndTime: string | null;
  hireDate: string | Date | null;
  birthday: string | Date | null;
  employeeNumber: string | null;
  language: string;
  canOverridePrices: boolean;
  maxDiscount: number;
  commissionRate: number;
  commissionMethod: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  addresses?: any[];
  accounts?: { provider: string; providerAccountId: string }[];
};

type TemplateData = {
  id: string;
  name: string;
  permissions: any;
};

export function UsersClient({ initialUsers, templates }: { initialUsers: UserData[], templates: TemplateData[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [loading, setLoading] = useState(false);

  // Focus User (for View/Edit)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"CUSTOMER" | "STAFF">("CUSTOMER");

  const filteredUsers = users.filter((u) => {
    if (activeTab === "STAFF") return u.role !== "USER";
    return u.role === "USER";
  });

  const counts = {
    CUSTOMER: users.filter((u) => u.role === "USER").length,
    STAFF: users.filter((u) => u.role !== "USER").length,
  };

  const addUserHref = `${pathname}/new?type=${activeTab === "CUSTOMER" ? "customer" : "staff"}`;
  const createButtonLabel = activeTab === "CUSTOMER" ? "Create Customer" : "Create Staff";

  // Form states (shared for Add/Edit)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    privileges: [] as string[],
    templateId: "" as string | null,
    customPermissions: null as any,
    phoneNumber: "",
    comments: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Sri Lanka",
    loginStartTime: "08:00",
    loginEndTime: "17:00",
    hireDate: null as Date | null,
    birthday: null as Date | null,
    employeeNumber: "",
    language: "en",
    canOverridePrices: false,
    maxDiscount: 0,
    commissionRate: 0,
    commissionMethod: "PERCENT_OF_SALE",
    image: [] as (string | File)[],
  });
  const [privilegeInput, setPrivilegeInput] = useState("");
  const isStandardUser = formData.role === "USER";

  const handleAddPrivilege = () => {
    if (privilegeInput.trim() && !formData.privileges.includes(privilegeInput.trim())) {
      setFormData({
        ...formData,
        privileges: [...formData.privileges, privilegeInput.trim()]
      });
      setPrivilegeInput("");
    }
  };

  const handleRemovePrivilege = (privilege: string) => {
    setFormData({
      ...formData,
      privileges: formData.privileges.filter((p) => p !== privilege)
    });
  };

  const handleAddClick = () => {
    setFormData({ 
      name: "", 
      email: "", 
      password: "", 
      role: "USER", 
      privileges: [], 
      templateId: "",
      customPermissions: null,
      phoneNumber: "",
      comments: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Sri Lanka",
      loginStartTime: "08:00",
      loginEndTime: "17:00",
      hireDate: new Date(),
      birthday: null,
      employeeNumber: "",
      language: "en",
      canOverridePrices: false,
      maxDiscount: 0,
      commissionRate: 0,
      commissionMethod: "PERCENT_OF_SALE",
      image: [] as (string | File)[],
    });
    setIsAddingUser(!isAddingUser);
    setIsEditing(false);
  };

  const handleEditClick = (user: UserData) => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role,
      privileges: user.privileges || [],
      templateId: user.templateId || "",
      customPermissions: user.customPermissions || null,
      phoneNumber: user.phoneNumber || "",
      comments: user.comments || "",
      addressLine1: user.addressLine1 || "",
      addressLine2: user.addressLine2 || "",
      city: user.city || "",
      state: user.state || "",
      zipCode: user.zipCode || "",
      country: user.country || "Sri Lanka",
      loginStartTime: user.loginStartTime || "08:00",
      loginEndTime: user.loginEndTime || "17:00",
      hireDate: user.hireDate ? new Date(user.hireDate) : null,
      birthday: user.birthday ? new Date(user.birthday) : null,
      employeeNumber: user.employeeNumber || "",
      language: user.language || "en",
      canOverridePrices: user.canOverridePrices || false,
      maxDiscount: user.maxDiscount || 0,
      commissionRate: user.commissionRate || 0,
      commissionMethod: user.commissionMethod || "PERCENT_OF_SALE",
      image: user.image ? [user.image] : [] as (string | File)[],
    });
    setSelectedUser(user);
    setIsEditing(true);
    setIsAddingUser(false);
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || isEditing) return;

    const user = users.find((u) => u.id === editId);
    if (!user) return;

    handleEditClick(user);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [searchParams, users, isEditing, pathname, router]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        image: formData.image.length > 0 && typeof formData.image[0] === 'string' ? formData.image[0] : undefined,
        ...(isStandardUser
          ? {
              templateId: null,
              customPermissions: null,
              privileges: [],
              hireDate: null,
              employeeNumber: "",
              loginStartTime: null,
              loginEndTime: null,
              canOverridePrices: false,
              maxDiscount: 0,
              commissionRate: 0,
              commissionMethod: null,
            }
          : {}),
      };

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create user");
      }

      const newUser = await res.json();
      setUsers([newUser, ...users]);
      toast({ title: "User created", description: `Successfully created ${newUser.name || 'user'}.` });
      setIsAddingUser(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);

    try {
      const payload = {
        ...formData,
        image: formData.image.length > 0 && typeof formData.image[0] === 'string' ? formData.image[0] : undefined,
        ...(isStandardUser
          ? {
              templateId: null,
              customPermissions: null,
              privileges: [],
              hireDate: null,
              employeeNumber: "",
              loginStartTime: null,
              loginEndTime: null,
              canOverridePrices: false,
              maxDiscount: 0,
              commissionRate: 0,
              commissionMethod: null,
            }
          : {}),
      };

      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update user");

      const updatedUser = await res.json();
      setUsers(users.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
      toast({ title: "User updated", description: "All changes saved." });
      setIsEditing(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: UserData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
      toast({ 
        title: user.isActive ? "User Suspended" : "User Activated", 
        description: `Successfully ${user.isActive ? 'suspended' : 'activated'} ${user.name || 'user'}.` 
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${user.email}?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      
      setUsers(users.filter(u => u.id !== user.id));
      toast({ title: "User Deleted", description: "Account removed from the system." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1F1720]">User Administration</h1>
            <p className="text-[#6B5A64] mt-2">Manage system roles, privileges, and account status.</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 w-fit rounded-2xl border border-gray-200 shadow-inner lg:ml-auto">
            <button
              onClick={() => setActiveTab("CUSTOMER")}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                activeTab === "CUSTOMER"
                  ? "bg-white text-[#A7066A] shadow-sm"
                  : "text-[#6B5A64] hover:text-[#1F1720]"
              )}
            >
              <Users className="w-4 h-4" />
              Customers
              <Badge className={cn(
                "ml-2 rounded-full px-2 py-0 h-5 min-w-[20px] flex items-center justify-center text-[10px]",
                activeTab === "CUSTOMER" ? "bg-[#A7066A] text-white" : "bg-gray-200 text-gray-500"
              )}>
                {counts.CUSTOMER}
              </Badge>
            </button>
            <button
              onClick={() => setActiveTab("STAFF")}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300",
                activeTab === "STAFF"
                  ? "bg-white text-purple-600 shadow-sm"
                  : "text-[#6B5A64] hover:text-[#1F1720]"
              )}
            >
              <Shield className="w-4 h-4" />
              Staff
              <Badge className={cn(
                "ml-2 rounded-full px-2 py-0 h-5 min-w-[20px] flex items-center justify-center text-[10px]",
                activeTab === "STAFF" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {counts.STAFF}
              </Badge>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <Button asChild className="bg-[#A7066A] hover:bg-[#8A0558] text-white rounded-full px-6">
            <Link href={addUserHref}>
              <Plus className="w-5 h-5 mr-2" />
              {createButtonLabel}
            </Link>
          </Button>
          {activeTab === "STAFF" ? (
            <Link href="/admin/permission-templates">
              <Button
                variant="outline"
                className="border-[#A7066A] text-[#A7066A] hover:bg-pink-50 rounded-full px-6 whitespace-nowrap"
              >
                <Shield className="w-5 h-5 mr-2" />
                Manage Permission Templates
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      {(isAddingUser || isEditing) && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-brand-border animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-pink-100 rounded-2xl text-[#A7066A]">
              <UserCog className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#1F1720]">
              {isEditing ? `Edit User: ${selectedUser?.name || 'User'}` : "Create New User"}
            </h2>
          </div>
          
          <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser} className="space-y-10">
            {/* 1. Personal & Contact Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Users className="w-5 h-5 text-[#A7066A]" />
                <h3 className="text-lg font-bold text-[#1F1720]">Personal & Contact Info</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <label className="text-sm font-semibold text-[#1F1720] block mb-2">Profile Image</label>
                  <ImageUpload 
                    value={formData.image} 
                    onChange={(urls) => setFormData({ ...formData, image: urls })} 
                  />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-[#1F1720]">Full Name</label>
                    <Input
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="full name"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">Email Address</label>
                    <Input 
                      required 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      placeholder="name@example.com" 
                      className="rounded-xl h-11" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">Phone Number</label>
                    <Input 
                      value={formData.phoneNumber || ""} 
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} 
                      placeholder="+94 77 123 4567" 
                      className="rounded-xl h-11" 
                    />
                  </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Password {isEditing && "(Leave blank to keep current)"}</label>
                  <Input 
                    required={!isEditing} 
                    type="password" 
                    value={formData.password} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                    placeholder={isEditing ? "••••••••" : "Minimum 6 characters"} 
                    minLength={6} 
                    className="rounded-xl h-11" 
                  />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Comments / Internal Notes</label>
                  <Textarea 
                    value={formData.comments || ""} 
                    onChange={(e) => setFormData({...formData, comments: e.target.value})} 
                    placeholder="Add any internal notes about this employee..." 
                    className="rounded-xl min-h-[100px]" 
                  />
                </div>
              </div>
            </div>

            {/* 2. Address Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <MapPin className="w-5 h-5 text-[#A7066A]" />
                <h3 className="text-lg font-bold text-[#1F1720]">Address Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Address Line 1</label>
                  <Input 
                    value={formData.addressLine1 || ""} 
                    onChange={(e) => setFormData({...formData, addressLine1: e.target.value})} 
                    placeholder="123 Main St" 
                    className="rounded-xl h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Address Line 2 (Optional)</label>
                  <Input 
                    value={formData.addressLine2 || ""} 
                    onChange={(e) => setFormData({...formData, addressLine2: e.target.value})} 
                    placeholder="Apartment or Suite" 
                    className="rounded-xl h-11" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">City</label>
                    <Input 
                      value={formData.city || ""} 
                      onChange={(e) => setFormData({...formData, city: e.target.value})} 
                      placeholder="Colombo" 
                      className="rounded-xl h-11" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">State/Province</label>
                    <Input 
                      value={formData.state || ""} 
                      onChange={(e) => setFormData({...formData, state: e.target.value})} 
                      placeholder="Western" 
                      className="rounded-xl h-11" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">Zip/Postal Code</label>
                    <Input 
                      value={formData.zipCode || ""} 
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})} 
                      placeholder="10110" 
                      className="rounded-xl h-11" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">Country</label>
                    <Input 
                      value={formData.country || ""} 
                      onChange={(e) => setFormData({...formData, country: e.target.value})} 
                      placeholder="Sri Lanka" 
                      className="rounded-xl h-11" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {!isStandardUser && (
            <>
            {/* 3. Professional & HR */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <UserCog className="w-5 h-5 text-[#A7066A]" />
                <h3 className="text-lg font-bold text-[#1F1720]">Professional & HR</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Employee Number</label>
                  <Input 
                    value={formData.employeeNumber || ""} 
                    onChange={(e) => setFormData({...formData, employeeNumber: e.target.value})} 
                    placeholder="EMP-001" 
                    className="rounded-xl h-11" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Preferred Language</label>
                  <select 
                    className="w-full flex h-11 items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] appearance-none"
                    value={formData.language} 
                    onChange={(e) => setFormData({...formData, language: e.target.value})}
                  >
                    <option value="en">English</option>
                    <option value="si">Sinhala</option>
                    <option value="ta">Tamil</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Hire Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 rounded-xl",
                          !formData.hireDate && "text-muted-foreground"
                        )}
                      >
                        <LucideCalendar className="mr-2 h-4 w-4" />
                        {formData.hireDate ? format(formData.hireDate as Date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.hireDate as Date}
                        onSelect={(date: Date | undefined) => setFormData({ ...formData, hireDate: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Birthday</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-11 rounded-xl",
                          !formData.birthday && "text-muted-foreground"
                        )}
                      >
                        <LucideCalendar className="mr-2 h-4 w-4" />
                        {formData.birthday ? format(formData.birthday as Date, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.birthday as Date}
                        onSelect={(date: Date | undefined) => setFormData({ ...formData, birthday: date || null })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">Login Allowed From</label>
                    <Input 
                      type="time"
                      value={formData.loginStartTime || "08:00"} 
                      onChange={(e) => setFormData({...formData, loginStartTime: e.target.value})} 
                      className="rounded-xl h-11" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#1F1720]">Login Allowed Until</label>
                    <Input 
                      type="time"
                      value={formData.loginEndTime || "17:00"} 
                      onChange={(e) => setFormData({...formData, loginEndTime: e.target.value})} 
                      className="rounded-xl h-11" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Financials */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <ShieldAlert className="w-5 h-5 text-[#A7066A]" />
                <h3 className="text-lg font-bold text-[#1F1720]">Financials</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-[#1F1720]">Override Price Adjustments</label>
                    <p className="text-xs text-gray-500">Allow modifying prices during checkout.</p>
                  </div>
                  <Switch 
                    checked={formData.canOverridePrices}
                    onCheckedChange={(checked) => setFormData({ ...formData, canOverridePrices: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Max Discount Allowed (%)</label>
                  <Input 
                    type="number"
                    value={formData.maxDiscount} 
                    onChange={(e) => setFormData({...formData, maxDiscount: parseFloat(e.target.value) || 0})} 
                    className="rounded-xl h-11" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[#1F1720]">Default Commission Rate (%)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.commissionRate} 
                    onChange={(e) => setFormData({...formData, commissionRate: parseFloat(e.target.value) || 0})} 
                    className="rounded-xl h-11" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Commission Percent Method</label>
                  <select 
                    className="w-full flex h-11 items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] appearance-none"
                    value={formData.commissionMethod || "PERCENT_OF_SALE"} 
                    onChange={(e) => setFormData({...formData, commissionMethod: e.target.value})}
                  >
                    <option value="PERCENT_OF_SALE">Percentage of Sale Total</option>
                    <option value="PERCENT_OF_PROFIT">Percentage of Profit</option>
                    <option value="FIXED_PER_ITEM">Fixed Amount Per Item</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 5. Permission Management */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Shield className="w-5 h-5 text-[#A7066A]" />
                <h3 className="text-lg font-bold text-[#1F1720]">Permission Management</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-[#1F1720]">Select Permission Template</label>
                  <select 
                    className="w-full flex h-12 items-center justify-between rounded-xl border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#A7066A] appearance-none"
                    value={formData.templateId || ""} 
                    onChange={(e) => {
                      const tid = e.target.value || null;
                      const template = templates.find(t => t.id === tid);
                      setFormData({
                        ...formData, 
                        templateId: tid,
                        customPermissions: template ? JSON.parse(JSON.stringify(template.permissions)) : null
                      });
                    }}
                  >
                    <option value="">No Template Assigned</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Permissions Tree Overrides */}
                <div className="md:col-span-2 space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#A7066A]" />
                        <h4 className="text-md font-bold text-[#1F1720]">Individual Permission Overrides</h4>
                      </div>
                      {formData.customPermissions && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setFormData({ ...formData, customPermissions: null })}
                          className="text-xs text-red-500 font-bold"
                        >
                          Clear Overrides
                        </Button>
                      )}
                  </div>

                  {!formData.customPermissions && !formData.templateId ? (
                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl text-center">
                        <p className="text-gray-400 font-medium">Select a template to view and customize detailed permissions.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.keys(PERMISSION_TREE_STRUCTURE).map((sectionKey) => {
                          const section = (PERMISSION_TREE_STRUCTURE as any)[sectionKey];
                          const permissions = formData.customPermissions || {};
                          const sectionPerms = permissions[sectionKey] || {};

                          return (
                            <div key={sectionKey} className="p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
                                  <span className="font-black text-sm uppercase tracking-wider text-[#A7066A]">{section.label}</span>
                              </div>
                              <div className="space-y-2">
                                  {Object.keys(section.permissions).map((actionKey) => (
                                    <div key={actionKey} className="flex items-center space-x-3 group">
                                      <Checkbox 
                                          id={`user-${sectionKey}.${actionKey}`}
                                          checked={sectionPerms[actionKey] || false}
                                          onCheckedChange={(checked) => {
                                            const newCustom = formData.customPermissions ? { ...formData.customPermissions } : {};
                                            if (!newCustom[sectionKey]) newCustom[sectionKey] = {};
                                            newCustom[sectionKey][actionKey] = !!checked;
                                            setFormData({ ...formData, customPermissions: newCustom });
                                          }}
                                          className="w-4 h-4 rounded border-gray-300 data-[state=checked]:bg-[#A7066A]"
                                      />
                                      <label 
                                          htmlFor={`user-${sectionKey}.${actionKey}`}
                                          className="text-xs font-bold text-gray-700 group-hover:text-black cursor-pointer transition-colors"
                                      >
                                          {section.permissions[actionKey]}
                                      </label>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => { setIsAddingUser(false); setIsEditing(false); }} className="rounded-full px-8">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-[#A7066A] hover:bg-[#8A0558] text-white px-12 rounded-full h-12 font-bold shadow-lg shadow-[#A7066A]/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {isEditing ? "Save Changes" : "Create Account"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#FAFAFA] border-b border-brand-border text-[#6B5A64]">
              <tr>
                <th className="px-8 py-5 font-bold uppercase tracking-wider text-xs">User Profile</th>
                <th className="px-8 py-5 font-bold uppercase tracking-wider text-xs">Status</th>
                <th className="px-8 py-5 font-bold uppercase tracking-wider text-xs">Access Level</th>
                <th className="px-8 py-5 font-bold uppercase tracking-wider text-xs">Registration</th>
                <th className="px-8 py-5 font-bold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody key={activeTab} className="divide-y divide-brand-border animate-in fade-in duration-300">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      {user.image ? (
                        <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
                          <img src={user.image} alt={user.name || "U"} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 bg-pink-50 rounded-full flex items-center justify-center text-[#A7066A] font-bold text-lg ring-2 ring-white">
                          {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </div>
                      )}
                      <div>
                        <Link href={`${pathname}/${user.id}`} className="font-bold text-[#1F1720] text-base hover:text-[#A7066A] transition-colors">
                          {user.name || "Unnamed"}
                        </Link>
                        <div className="text-[#6B5A64] text-xs flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {user.isActive ? (
                      <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-100 flex items-center gap-1.5 w-fit rounded-full px-3 py-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 flex items-center gap-1.5 w-fit rounded-full px-3 py-1">
                        <UserMinus className="w-3.5 h-3.5" />
                        Suspended
                      </Badge>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={cn(
                        "w-fit rounded-lg px-2 text-[10px] uppercase font-black tracking-widest border-none",
                        user.role === "SUPER_ADMIN", "DEV_ADMIN" ? "bg-purple-100 text-purple-700" : 
                        user.role.includes("ADMIN") ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {user.role.replace("_", " ")}
                      </Badge>
                      <div className="flex gap-1 overflow-hidden max-w-[150px]">
                        {user.privileges?.slice(0, 2).map((p, i) => (
                          <span key={i} className="text-[10px] text-gray-400 font-medium">#{p}</span>
                        ))}
                        {user.privileges?.length > 2 && <span className="text-[10px] text-gray-400">+{user.privileges.length - 2}</span>}
                      </div>
                      {user.template && (
                        <div className="flex items-center gap-1 mt-1">
                          <ShieldCheck className="w-3 h-3 text-[#A7066A]" />
                          <span className="text-[10px font-extrabold uppercase text-[#A7066A] tracking-tighter">
                            {user.template.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-[#1F1720] font-medium">{new Date(user.createdAt).toLocaleDateString()}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <LucideCalendar className="w-3 h-3" />
                      {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild variant="outline" size="sm" className="rounded-full">
                        <Link href={`${pathname}/${user.id}`}>View</Link>
                      </Button>
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-xl border-gray-100">
                        <DropdownMenuItem asChild className="rounded-lg gap-2 cursor-pointer">
                          <Link href={`${pathname}/${user.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="rounded-lg gap-2 cursor-pointer">
                          <Link href={`${pathname}/${user.id}/edit`}>
                            <Edit className="w-4 h-4 text-amber-500" />
                            Edit Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleUserStatus(user)} className="rounded-lg gap-2 cursor-pointer">
                          {user.isActive ? (
                            <><Ban className="w-4 h-4 text-orange-500" /> Suspend Account</>
                          ) : (
                            <><UserCheck className="w-4 h-4 text-emerald-500" /> Activate Account</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="rounded-lg gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
