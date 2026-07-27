"use client";

import React, { useState } from "react";
import { 
  Plus, Trash2, Edit, Save, X, Search, 
  ShieldCheck, ArrowLeft, Loader2, Users, 
  ChevronRight, ChevronDown, CheckSquare, Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  PERMISSION_TREE_STRUCTURE, 
  DEFAULT_PERMISSIONS, 
  PermissionTree 
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  permissions: any; // Type-safe casting on access
  _count?: { users: number };
  createdAt: string | Date;
}

export function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<{ name: string; permissions: PermissionTree }>({
    name: "",
    permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)),
  });

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        permissions: template.permissions as PermissionTree,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)),
      });
    }
    setIsModalOpen(true);
  };

  const handleTogglePermission = (section: string, action: string) => {
    const newPermissions = { ...formData.permissions };
    if (!newPermissions[section]) newPermissions[section] = {};
    newPermissions[section][action] = !newPermissions[section][action];
    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleToggleSection = (section: string) => {
    const newPermissions = { ...formData.permissions };
    const sectionConfig = (PERMISSION_TREE_STRUCTURE as any)[section];
    const anyChecked = Object.keys(sectionConfig.permissions).some(
      perm => newPermissions[section][perm]
    );

    Object.keys(sectionConfig.permissions).forEach(perm => {
      newPermissions[section][perm] = !anyChecked;
    });

    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return toast({ title: "Name required", variant: "destructive" });
    }

    setLoading(true);
    try {
      const url = editingTemplate 
        ? `/api/admin/permission-templates/${editingTemplate.id}` 
        : "/api/admin/permission-templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Something went wrong");
      }

      const savedTemplate = await res.json();
      
      if (editingTemplate) {
        setTemplates(templates.map(t => t.id === savedTemplate.id ? savedTemplate : t));
        toast({ title: "Template Updated", description: "All changes saved successfully." });
      } else {
        setTemplates([...templates, savedTemplate]);
        toast({ title: "Template Created", description: `"${savedTemplate.name}" template is ready to use.` });
      }
      
      setIsModalOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (template: Template) => {
    if (template._count?.users && template._count.users > 0) {
      return toast({ 
        title: "Cannot Delete", 
        description: "This template is currently assigned to users.",
        variant: "destructive"
      });
    }

    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/permission-templates/${template.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setTemplates(templates.filter(t => t.id !== template.id));
      toast({ title: "Deleted", description: "Template removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
             <Link href="/admin/users" className="text-[#A7066A] hover:underline flex items-center gap-1 text-sm font-bold">
               <ArrowLeft className="w-4 h-4" /> Back to Users
             </Link>
          </div>
          <h1 className="text-4xl font-black text-[#1F1720] tracking-tight">Permission Templates</h1>
          <p className="text-[#6B5A64] max-w-2xl font-medium">
            Define sets of permissions that can be assigned to system users and custom roles.
          </p>
        </div>
        <Button 
          onClick={() => handleOpenModal()} 
          className="bg-[#A7066A] hover:bg-[#8A0558] text-white rounded-full px-8 h-14 font-black shadow-lg shadow-[#A7066A]/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-6 h-6 mr-2" />
          Create New Template
        </Button>
      </div>

      {/* Stats & Tools */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            placeholder="Search templates..." 
            className="pl-12 rounded-2xl h-12 bg-white border-brand-border focus:ring-[#A7066A]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 text-sm text-[#6B5A64] font-bold bg-gray-50 px-4 py-2 rounded-full border border-gray-100 italic">
          <ShieldCheck className="w-4 h-4 text-[#A7066A]" /> {templates.length} Templates defined
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div 
            key={template.id} 
            className="bg-white p-8 rounded-[2.5rem] border border-brand-border shadow-sm hover:shadow-xl hover:border-[#A7066A]/30 transition-all duration-300 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-6 flex gap-2">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleOpenModal(template)}
                className="rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors"
               >
                 <Edit className="w-5 h-5" />
               </Button>
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDelete(template)}
                className="rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
               >
                 <Trash2 className="w-5 h-5" />
               </Button>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <div className="p-4 bg-purple-100 rounded-3xl text-purple-600 group-hover:bg-[#A7066A] group-hover:text-white transition-all duration-500">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#1F1720] tracking-tight">{template.name}</h3>
                <p className="text-xs text-[#6B5A64] font-bold uppercase tracking-widest mt-1">Permission Profile</p>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-bold text-gray-700">Assigned Users</span>
                  </div>
                  <Badge className="bg-white text-[#A7066A] border-gray-100 rounded-full font-black">
                     {template._count?.users || 0}
                  </Badge>
               </div>

               <div className="flex flex-wrap gap-2">
                  {Object.keys(template.permissions).map((section) => {
                    const sectionPerms = template.permissions[section];
                    const activeCount = Object.values(sectionPerms).filter(v => v === true).length;
                    if (activeCount === 0) return null;
                    return (
                      <Badge key={section} variant="outline" className="rounded-lg text-[10px] uppercase font-black bg-gray-50 border-gray-200">
                        {section}: {activeCount}
                      </Badge>
                    );
                  })}
               </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-dashed border-gray-100">
              <Button 
                variant="ghost" 
                onClick={() => handleOpenModal(template)}
                className="w-full rounded-2xl font-bold flex justify-between group/btn text-[#6B5A64] hover:text-[#A7066A] hover:bg-pink-50"
              >
                Manage Permissions
                <ChevronRight className="w-4 h-4 translate-x-0 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
             <div className="p-6 bg-white rounded-full shadow-sm mb-4">
                <Search className="w-12 h-12 text-gray-300" />
             </div>
             <p className="text-xl font-bold text-gray-400">No templates found matching your search.</p>
             <Button variant="link" onClick={() => setSearchTerm("")} className="text-[#A7066A] font-bold mt-2">Clear search filters</Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[3rem] border-none shadow-2xl">
          <DialogHeader className="p-8 pb-4 bg-white sticky top-0 z-10">
            <DialogTitle className="text-3xl font-black text-[#1F1720]">
              {editingTemplate ? `Edit Template: ${editingTemplate.name}` : "Create Permission Template"}
            </DialogTitle>
            <DialogDescription className="text-[#6B5A64] font-medium text-lg">
              Toggle specific capabilities for this template. Users assigned to this template will inherit these permissions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 space-y-8">
            <div className="space-y-4">
              <Label className="text-base font-black text-[#1F1720]">Template Name</Label>
              <Input 
                required 
                placeholder="e.g. Warehouse Manager, Inventory Admin" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-14 rounded-2xl text-lg font-medium border-brand-border focus:ring-[#A7066A] px-6"
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-xl font-black text-[#1F1720]">Permissions Audit</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    const newPermissions = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
                    setFormData({ ...formData, permissions: newPermissions });
                  }} className="text-xs font-black uppercase text-gray-400 hover:text-red-500">
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(PERMISSION_TREE_STRUCTURE).map((sectionKey) => {
                  const section = (PERMISSION_TREE_STRUCTURE as any)[sectionKey];
                  const currentPermissions = formData.permissions[sectionKey] || {};
                  const allChecked = Object.keys(section.permissions).every(p => currentPermissions[p]);
                  const someChecked = Object.keys(section.permissions).some(p => currentPermissions[p]);

                  return (
                    <div key={sectionKey} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex flex-col h-full hover:border-purple-200 transition-colors">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200/50">
                        <Label 
                          className="text-lg font-black text-[#1F1720] cursor-pointer flex items-center gap-3"
                          onClick={() => handleToggleSection(sectionKey)}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-colors border-2",
                            allChecked ? "bg-[#A7066A] border-[#A7066A]" : someChecked ? "bg-purple-200 border-purple-300" : "bg-white border-gray-300"
                          )}>
                             {allChecked ? <CheckSquare className="w-4 h-4 text-white" /> : someChecked ? <div className="w-2 h-2 bg-[#A7066A] rounded-sm" /> : null}
                          </div>
                          {section.label}
                        </Label>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {Object.keys(section.permissions).map((actionKey) => (
                          <div key={actionKey} className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl hover:bg-white transition-colors group">
                            <Checkbox 
                              id={`${sectionKey}.${actionKey}`}
                              checked={currentPermissions[actionKey] || false}
                              onCheckedChange={() => handleTogglePermission(sectionKey, actionKey)}
                              className="w-5 h-5 rounded-md border-2 border-gray-300 data-[state=checked]:bg-[#A7066A] data-[state=checked]:border-[#A7066A]"
                            />
                            <Label 
                              htmlFor={`${sectionKey}.${actionKey}`}
                              className="text-sm font-bold text-gray-600 group-hover:text-[#1F1720] cursor-pointer flex-1"
                            >
                              {section.permissions[actionKey]}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>

          <DialogFooter className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3 sticky bottom-0 z-10">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsModalOpen(false)}
              className="rounded-full px-8 h-12 font-bold text-gray-500"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              onClick={handleSubmit}
              className="bg-[#A7066A] hover:bg-[#8A0558] text-white rounded-full px-12 h-12 font-black shadow-lg shadow-[#A7066A]/20"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? "Update Template" : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
