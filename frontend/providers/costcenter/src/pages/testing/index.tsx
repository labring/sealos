import {
  Avatar,
  AvatarFallback,
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { CircleCheck, CircleHelp, Gift, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@sealos/shadcn-ui/tabs';

function PlanHeader() {
  return (
    <div className="bg-white shadow-sm border p-2 rounded-2xl">
      {/* Magic Values! */}
      <div className="bg-plan-starter rounded-xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-slate-500 text-sm">Current Workspace Plan</span>
            <h1 className="font-semibold text-2xl">Starter Plan</h1>
          </div>

          <Button size="lg">
            <Sparkles />
            <span>Upgrade Plan</span>
          </Button>
        </div>

        <Separator className="border-slate-200" />

        <div className="grid grid-cols-3 gap-2">
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">16 vCPU</span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">16 vCPU</span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">16 vCPU</span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">16 vCPU</span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">16 vCPU</span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">16 vCPU</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 grid grid-cols-2">
        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Price/Month</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            $5
          </span>
        </div>

        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Renewal Time</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            2025/08/29 14:51
          </span>
        </div>
      </div>
    </div>
  );
}

function AllPlansSection() {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="text-foreground font-medium text-base px-4 py-3 border-b bg-zinc-50">
        Beijing A
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-b">
            <TableHead className="bg-transparent">Workspace</TableHead>
            <TableHead className="bg-transparent">Plan</TableHead>
            <TableHead className="bg-transparent">Renewal Time</TableHead>
            <TableHead className="bg-transparent">Price</TableHead>
            <TableHead className="bg-transparent">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="text-foreground">
          <TableRow className="not-last:border-b">
            <TableCell className="h-14">
              <div className="flex items-center gap-2.5">
                <Avatar className="size-5">
                  <AvatarFallback>F</AvatarFallback>
                </Avatar>
                <div>sealos-test</div>
              </div>
            </TableCell>
            <TableCell>
              <Badge className="bg-plan-payg text-blue-600 font-medium">PAYG</Badge>
            </TableCell>
            <TableCell>2024-12-14 16:00</TableCell>
            <TableCell>$250.00</TableCell>
            <TableCell>
              <Button variant="outline" size="sm">
                Subscribe
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function UpgradePlanCard({ className }: { className?: string }) {
  return (
    <section className={cn('flex flex-col border p-8 shadow-sm rounded-2xl bg-card', className)}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Starter</h2>
        <Badge variant="default" className="bg-blue-600 rounded-full font-semibold">
          Most Popular
        </Badge>
      </div>

      <p className="mt-3 text-muted-foreground text-sm">
        For hobbyist developers building side projects.
      </p>

      <div className="mt-4">
        <span className="text-4xl font-semibold">$58</span>
        <span className="text-muted-foreground">/month</span>
      </div>

      <Button className="mt-4">Your current plan</Button>

      <ul className="flex mt-6 gap-3 flex-col">
        <li className="flex gap-2">
          <CircleCheck size={20} className="text-blue-600" />
          <span className="text-muted-foreground text-sm">1 vCPU</span>
        </li>
        <li className="flex gap-2">
          <CircleCheck size={20} className="text-blue-600" />
          <span className="text-muted-foreground text-sm">2GB RAM</span>
        </li>
        <li className="flex gap-2">
          <CircleCheck size={20} className="text-blue-600" />
          <span className="text-muted-foreground text-sm">2GB Disk</span>
        </li>
        <li className="flex gap-2">
          <CircleCheck size={20} className="text-blue-600" />
          <span className="text-muted-foreground text-sm">3GB Traffic</span>
        </li>
        <li className="flex gap-2">
          <CircleCheck size={20} className="text-blue-600" />
          <span className="text-muted-foreground text-sm">1 Port</span>
        </li>
      </ul>
    </section>
  );
}

function UpgradePlanDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">UpgradePlanDialog</Button>
      </DialogTrigger>
      <DialogContent className="min-w-[70rem] py-8 px-20 bg-zinc-50">
        <div className="flex flex-col justify-center">
          <section className="mt-6">
            <h1 className="text-3xl font-semibold text-center">Choose Your Workspace Plan</h1>
            <p className="text-zinc-500 text-center mt-2">
              Pricing Plans That Power Your Sealos Journey
            </p>
          </section>

          <div className="flex pt-6 gap-3">
            <UpgradePlanCard />
            <UpgradePlanCard />
            <UpgradePlanCard />
          </div>

          <Button variant="link" className="underline text-zinc-600 text-base mt-4" asChild>
            <a href="">Still wanna charge by volume?</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopupDialog() {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline">TopupDialog</Button>
        </DialogTrigger>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle>Credit Purchase</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <section className="w-full bg-plan-payg px-6 py-5 rounded-xl gap-1 flex flex-col">
              <span className="text-slate-500 text-sm">Balance</span>
              <span className="text-2xl font-semibold leading-none">$5.00</span>
            </section>

            <section>
              <div className="flex justify-between">
                <div className="font-medium">Select Amount</div>
                <div className="text-sm flex gap-1">
                  <Gift size={16} className="text-blue-600" />
                  <span>Earn Credits with Initial Purchase!</span>
                  <CircleHelp size={16} className="text-zinc-400" />
                </div>
              </div>

              <div className="mt-2">
                <RadioGroup defaultValue="16" className="grid grid-cols-3 gap-2">
                  <Label className="border w-full">
                    <RadioGroupItem value="16" />
                    <div className="p-4">$16</div>
                  </Label>

                  <Label>
                    <RadioGroupItem value="16" />
                    <div>$16</div>
                  </Label>

                  <Label>
                    <RadioGroupItem value="16" />
                    <div>$16</div>
                  </Label>
                </RadioGroup>
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button type="submit">Pay with Stripe</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

export default function Testing() {
  return (
    <div className="p-8 bg-white gap-8 flex flex-col">
      <PlanHeader></PlanHeader>

      {/* Balance card */}
      <div className="p-2 border shadow-sm rounded-2xl">
        <div className="bg-plan-payg flex justify-between items-center rounded-xl px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-slate-500">Balance</span>
            <span className="text-foreground text-2xl font-semibold leading-none">$5.00</span>
          </div>

          <div className="flex gap-4 items-center">
            <Button variant="outline">Redeem</Button>
            <Button variant="outline">Top Up</Button>
          </div>
        </div>
      </div>

      {/* All Plans */}
      <AllPlansSection />

      <UpgradePlanDialog></UpgradePlanDialog>
      <TopupDialog></TopupDialog>
    </div>
  );
}
