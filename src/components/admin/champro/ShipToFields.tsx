import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ShipToFieldsProps {
  values: {
    ShipToFirstName: string;
    ShipToLastName: string;
    Address: string;
    Address2: string;
    City: string;
    StateCode: string;
    ZIPCode: string;
    CountryCode: string;
    Phone: string;
    IsResidential: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

export function ShipToFields({ values, onChange }: ShipToFieldsProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Ship-To Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ShipToFirstName">First Name *</Label>
          <Input
            id="ShipToFirstName"
            value={values.ShipToFirstName}
            onChange={(e) => onChange("ShipToFirstName", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ShipToLastName">Last Name *</Label>
          <Input
            id="ShipToLastName"
            value={values.ShipToLastName}
            onChange={(e) => onChange("ShipToLastName", e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="Address">Address *</Label>
        <Input
          id="Address"
          value={values.Address}
          onChange={(e) => onChange("Address", e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="Address2">Address 2</Label>
        <Input
          id="Address2"
          value={values.Address2}
          onChange={(e) => onChange("Address2", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="City">City *</Label>
          <Input
            id="City"
            value={values.City}
            onChange={(e) => onChange("City", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="StateCode">State Code *</Label>
          <Input
            id="StateCode"
            value={values.StateCode}
            onChange={(e) => onChange("StateCode", e.target.value)}
            placeholder="e.g., IL"
            maxLength={2}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ZIPCode">ZIP Code *</Label>
          <Input
            id="ZIPCode"
            value={values.ZIPCode}
            onChange={(e) => onChange("ZIPCode", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="CountryCode">Country *</Label>
          <Input
            id="CountryCode"
            value={values.CountryCode}
            onChange={(e) => onChange("CountryCode", e.target.value)}
            placeholder="e.g., US"
            maxLength={2}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="Phone">Phone</Label>
          <Input
            id="Phone"
            value={values.Phone}
            onChange={(e) => onChange("Phone", e.target.value)}
            type="tel"
          />
        </div>
        <div className="flex items-center space-x-2 pt-8">
          <Checkbox
            id="IsResidential"
            checked={values.IsResidential}
            onCheckedChange={(checked) => onChange("IsResidential", checked === true)}
          />
          <Label htmlFor="IsResidential" className="cursor-pointer">
            Residential Address
          </Label>
        </div>
      </div>
    </div>
  );
}
