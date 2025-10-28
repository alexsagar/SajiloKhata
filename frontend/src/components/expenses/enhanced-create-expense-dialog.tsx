"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  DollarSign, 
  Users, 
  Calculator,
  X,
  Search,
  Plus,
  Receipt,
  UserPlus
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Friend {
  id: string
  name: string
  email: string
  avatar?: string
}

interface Group {
  id: string
  name: string
  members: Friend[]
}

interface Participant {
  id: string
  name: string
  email: string
  avatar?: string
  amount: number
  isSelected: boolean
}

interface CreateExpenseDialogProps {
  children: React.ReactNode
  groupId?: string
  onExpenseCreated?: (expense: any) => void
}

// Empty initial data - will be populated from API
const mockFriends: Friend[] = []
const mockGroups: Group[] = []

export function EnhancedCreateExpenseDialog({ children, groupId, onExpenseCreated }: CreateExpenseDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'percentage'>('equal')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'friends' | 'groups'>('friends')
  const { toast } = useToast()

  // Initialize with current user
  const currentUser: Participant = {
    id: 'current-user',
    name: 'You',
    email: 'you@example.com',
    amount: 0,
    isSelected: true
  }

  const filteredFriends = mockFriends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGroups = mockGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFriendToggle = (friend: Friend) => {
    setParticipants(prev => {
      const exists = prev.find(p => p.id === friend.id)
      if (exists) {
        return prev.filter(p => p.id !== friend.id)
      } else {
        return [...prev, {
          id: friend.id,
          name: friend.name,
          email: friend.email,
          avatar: friend.avatar,
          amount: 0,
          isSelected: true
        }]
      }
    })
  }

  const handleGroupSelect = (group: Group) => {
    // Add all group members who aren't already added
    const newParticipants = group.members.filter(member => 
      !participants.some(p => p.id === member.id)
    ).map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      avatar: member.avatar,
      amount: 0,
      isSelected: true
    }))

    setParticipants(prev => [...prev, ...newParticipants])
    
    toast({
      title: "Group members added",
      description: `Added ${newParticipants.length} members from ${group.name}`,
    })
  }

  const handleRemoveParticipant = (participantId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== participantId))
  }

  const handleAmountChange = (participantId: string, amount: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId 
        ? { ...p, amount: parseFloat(amount) || 0 }
        : p
    ))
  }

  const calculateSplit = () => {
    const totalAmount = parseFloat(expenseAmount) || 0
    const selectedParticipants = [currentUser, ...participants.filter(p => p.isSelected)]
    
    if (splitMethod === 'equal') {
      const splitAmount = totalAmount / selectedParticipants.length
      return selectedParticipants.map(p => ({ ...p, amount: splitAmount }))
    }
    
    return selectedParticipants
  }

  const handleCreateExpense = () => {
    if (!expenseTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the expense.",
        variant: "destructive"
      })
      return
    }

    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      toast({
        title: "Amount required",
        description: "Please enter a valid amount.",
        variant: "destructive"
      })
      return
    }

    const selectedParticipants = [currentUser, ...participants.filter(p => p.isSelected)]
    
    if (selectedParticipants.length < 2) {
      toast({
        title: "Add participants",
        description: "Please add at least one other person to split the expense with.",
        variant: "destructive"
      })
      return
    }

    const splits = calculateSplit()
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0)
    const expenseTotal = parseFloat(expenseAmount)

    if (splitMethod === 'custom' && Math.abs(totalSplitAmount - expenseTotal) > 0.01) {
      toast({
        title: "Split amounts don't match",
        description: `Split total (${totalSplitAmount.toFixed(2)}) doesn't equal expense amount (${expenseTotal.toFixed(2)}).`,
        variant: "destructive"
      })
      return
    }

    const newExpense = {
      id: Date.now().toString(),
      title: expenseTitle.trim(),
      amount: expenseTotal,
      description: expenseDescription.trim(),
      category: expenseCategory,
      paidBy: currentUser,
      participants: splits,
      splitMethod,
      groupId,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0]
    }

    // Reset form
    setExpenseTitle('')
    setExpenseAmount('')
    setExpenseDescription('')
    setExpenseCategory('')
    setParticipants([])
    setSplitMethod('equal')
    setSearchTerm('')
    setIsOpen(false)

    onExpenseCreated?.(newExpense)

    toast({
      title: "Expense created!",
      description: `Created "${newExpense.title}" for $${newExpense.amount} split between ${splits.length} people.`,
    })
  }

  const splits = calculateSplit()
  const totalAmount = parseFloat(expenseAmount) || 0

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md w-auto max-h-[85vh] mx-auto">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>
              Add an expense and split it with friends or groups
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Expense Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="title">Expense Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Dinner at restaurant"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food & Dining</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="utilities">Bills & Utilities</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Add Participants */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Split With</h3>
              </div>
              
              <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="friends">Add Friends</TabsTrigger>
                  <TabsTrigger value="groups">Add from Groups</TabsTrigger>
                </TabsList>
                
                <TabsContent value="friends" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search friends..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleFriendToggle(friend)}
                      >
                        <Checkbox
                          checked={participants.some(p => p.id === friend.id)}
                          onCheckedChange={() => handleFriendToggle(friend)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>
                            {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{friend.name}</p>
                          <p className="text-xs text-muted-foreground">{friend.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="groups" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <Users className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {group.members.length} members
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGroupSelect(group)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add All
                        </Button>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Split Method */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Split Method
              </h3>
              
              <RadioGroup value={splitMethod} onValueChange={(value: any) => setSplitMethod(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="equal" id="equal" />
                  <Label htmlFor="equal">Split equally</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Enter exact amounts</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage">Split by percentage</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Participants Preview */}
            {(participants.length > 0 || totalAmount > 0) && (
              <div className="space-y-3">
                <h4 className="font-medium">Split Preview</h4>
                <div className="space-y-2">
                  {splits.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                          {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{participant.name}</p>
                        <p className="text-xs text-muted-foreground">{participant.email}</p>
                      </div>
                      
                      {splitMethod === 'custom' ? (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={participant.amount || ''}
                          onChange={(e) => handleAmountChange(participant.id, e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        <div className="text-right">
                          <div className="font-semibold">${participant.amount.toFixed(2)}</div>
                        </div>
                      )}
                      
                      {participant.id !== 'current-user' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {totalAmount > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExpense}>
              <Receipt className="h-4 w-4 mr-2" />
              Create Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}