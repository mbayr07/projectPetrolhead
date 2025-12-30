import React, { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet";
import { Upload, File, Trash2, Download } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDocuments } from "@/hooks/useDocuments";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/components/ui/use-toast";

export default function DocumentVault() {
  const { documents, addDocument, deleteDocument } = useDocuments();
  const { vehicles } = useVehicles();
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: "",
    name: "",
    type: "insurance",
  });

  const handleUpload = (e) => {
    e.preventDefault();

    const file = e.target.file.files[0];
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    addDocument({
      ...formData,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      url: "#",
    });

    toast({
      title: "Document Uploaded",
      description: "Your document has been saved to the vault.",
    });

    setUploadDialogOpen(false);
    setFormData({ vehicleId: "", name: "", type: "insurance" });
  };

  const handleDelete = (id) => {
    deleteDocument(id);
    toast({
      title: "Document Deleted",
      description: "Document has been removed from the vault.",
    });
  };

  const getVehicleName = (vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle ? vehicle.nickname : "Unknown Vehicle";
  };

  const documentTypes = {
    insurance: "Insurance",
    mot: "MOT Certificate",
    service: "Service Record",
    tax: "Tax Document",
    other: "Other",
  };

  return (
    <Layout>
      <Helmet>
        <title>Document Vault - Vehicle Guardian</title>
        <meta
          name="description"
          content="Securely store and manage all your vehicle documents in one place. Upload insurance certificates, MOT documents, and service records."
        />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Document Vault
            </h1>
            <p className="text-muted-foreground">Securely store all your vehicle documents</p>
          </div>

          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-secondary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {documents.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
              <File className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No documents yet</h3>
            <p className="text-muted-foreground mb-6">Upload your first document to get started</p>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </motion.div>
        ) : (
          // ✅ PHONE-FRAME FRIENDLY: always single column
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <File className="h-6 w-6" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        toast({
                          title: "🚧 Feature Coming Soon",
                          description: "Document download will be available soon!",
                        })
                      }
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold mb-1">{doc.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{getVehicleName(doc.vehicleId)}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{documentTypes[doc.type]}</span>
                  <span>{doc.size}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Uploaded: {new Date(doc.uploadDate).toLocaleDateString("en-GB")}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                value={formData.vehicleId}
                onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Document Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Insurance Certificate 2024"
                required
              />
            </div>

            <div>
              <Label htmlFor="type">Document Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="file">File</Label>
              <Input id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required />
            </div>

            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-secondary">
              Upload Document
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}