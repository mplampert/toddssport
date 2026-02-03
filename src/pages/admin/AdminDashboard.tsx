import { AdminLayout } from "@/components/admin/AdminLayout";
import { Link } from "react-router-dom";
import { 
  BookOpen, 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const adminSections = [
  {
    title: "Catalogs",
    description: "Manage product catalogs and publications",
    icon: BookOpen,
    path: "/admin/catalogs",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Champro Orders",
    description: "View and process custom uniform orders",
    icon: Package,
    path: "/admin/champro-orders",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Champro Pricing",
    description: "Manage wholesale costs and markup percentages",
    icon: DollarSign,
    path: "/admin/champro-pricing",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Sales Flyers",
    description: "Create and manage product sales flyers",
    icon: FileText,
    path: "/admin/flyers",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const quickStats = [
  { label: "Active Products", value: "11", icon: ShoppingCart },
  { label: "Pending Orders", value: "—", icon: Package },
  { label: "This Month", value: "—", icon: TrendingUp },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your store, orders, and pricing
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickStats.map((stat) => (
            <Card key={stat.label} className="bg-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Sections */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Manage</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminSections.map((section) => (
              <Link key={section.path} to={section.path}>
                <Card className="h-full hover:border-accent hover:shadow-md transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-2`}>
                      <section.icon className={`w-6 h-6 ${section.color}`} />
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {section.title}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/admin/champro-orders">
                <Package className="w-4 h-4 mr-2" />
                View Orders
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/champro-pricing">
                <DollarSign className="w-4 h-4 mr-2" />
                Update Pricing
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/catalogs">
                <BookOpen className="w-4 h-4 mr-2" />
                Manage Catalogs
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
