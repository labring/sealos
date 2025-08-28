import { Button } from '@sealos/shadcn-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@sealos/shadcn-ui/card';
import { Input } from '@sealos/shadcn-ui/input';
import { Label } from '@sealos/shadcn-ui/label';

export default function TestShadcnIntegration() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Shadcn/ui Integration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-input">Test Input</Label>
            <Input id="test-input" placeholder="Enter some text..." />
          </div>
          <Button variant={'outline'} className="w-full">
            Test Button
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
