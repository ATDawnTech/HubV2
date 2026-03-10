import React, { useState } from 'react';
import { useAuthz } from '@/hooks/useAuthz';
import { useAuth } from '@/hooks/useAuth';
import { 
  useEmployeeSkills, 
  useEmployeeCertifications, 
  useSkillsCatalog,
  useAddEmployeeSkill,
  useRemoveEmployeeSkill,
  useAddCertification,
  useUpdateCertification,
  useDeleteCertification,
  useAddSkill,
  useEmployeesBySkill,
  useEmployees
} from '@/hooks/useEmployees';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Plus, 
  Search, 
  Award, 
  Code, 
  X,
  Calendar,
  Building,
  User,
  Info
} from 'lucide-react';

export function SkillsAndCertifications() {
  const { user } = useAuth();
  const { isAdmin } = useAuthz();
  const [selectedUserId, setSelectedUserId] = useState(user?.id || '');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [minLevel, setMinLevel] = useState(0);
  
  // For self-service, use current user. For admin, allow selection
  const currentUserId = isAdmin ? selectedUserId : user?.id || '';
  
  const { data: userSkills, isLoading: skillsLoading } = useEmployeeSkills(currentUserId);
  const { data: userCertifications, isLoading: certsLoading } = useEmployeeCertifications(currentUserId);
  const { data: skillsCatalog } = useSkillsCatalog();
  const { data: allEmployees } = useEmployees(); // For admin employee selection
  
  // Search employees by skill
  const skillSearchTerms = skillSearchQuery.trim() 
    ? skillSearchQuery.split(',').map(term => term.trim()).filter(Boolean)
    : [];
  
  const { data: searchResults, isLoading: searchLoading } = useEmployeesBySkill(
    skillSearchTerms,
    minLevel
  );
  
  const addEmployeeSkill = useAddEmployeeSkill();
  const removeEmployeeSkill = useRemoveEmployeeSkill();
  const addCertification = useAddCertification();
  const updateCertification = useUpdateCertification();
  const deleteCertification = useDeleteCertification();
  const addSkill = useAddSkill();

  const handleAddSkill = async (skillId: string, level: number, years?: number) => {
    if (!currentUserId) return;
    
    await addEmployeeSkill.mutateAsync({
      user_id: currentUserId,
      skill_id: skillId,
      level,
      years: years || 0,
    });
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!currentUserId) return;
    
    await removeEmployeeSkill.mutateAsync({
      userId: currentUserId,
      skillId,
    });
  };

  const handleAddCertification = async (certification: any) => {
    if (!currentUserId) return;
    
    await addCertification.mutateAsync({
      ...certification,
      user_id: currentUserId,
    });
  };

  const getSkillLevelColor = (level: number) => {
    if (level <= 2) return 'bg-red-500';
    if (level <= 4) return 'bg-yellow-500';
    if (level <= 6) return 'bg-blue-500';
    if (level <= 8) return 'bg-green-500';
    return 'bg-purple-500';
  };

  const getSkillLevelText = (level: number) => {
    if (level <= 2) return 'Beginner';
    if (level <= 4) return 'Intermediate';
    if (level <= 6) return 'Advanced';
    if (level <= 8) return 'Expert';
    return 'Master';
  };

  if (skillsLoading || certsLoading) {
    return <div className="flex items-center justify-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={isAdmin ? "search" : "my-skills"} className="w-full">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {!isAdmin && <TabsTrigger value="my-skills">My Skills</TabsTrigger>}
          {!isAdmin && <TabsTrigger value="my-certifications">My Certifications</TabsTrigger>}
          {isAdmin && <TabsTrigger value="search">Search by Skills</TabsTrigger>}
          {isAdmin && <TabsTrigger value="manage-skills">Manage Employee Skills</TabsTrigger>}
          {isAdmin && <TabsTrigger value="manage-certifications">Manage Certifications</TabsTrigger>}
        </TabsList>

        {!isAdmin && <TabsContent value="my-skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Technical Skills
              </CardTitle>
              <CardDescription>
                Manage your technical skills and expertise levels (0-9 scale)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddSkillDialog 
                skillsCatalog={skillsCatalog || []}
                userSkills={userSkills || []}
                onAddSkill={handleAddSkill}
                onAddNewSkill={(skill) => addSkill.mutateAsync({ ...skill, category: skill.category || null })}
              />
              
              <div className="space-y-3">
                {userSkills?.map((userSkill) => (
                  <div key={userSkill.skill_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{userSkill.skill?.category}</Badge>
                      <div>
                        <div className="font-medium">{userSkill.skill?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Level {userSkill.level} • {getSkillLevelText(userSkill.level)}
                          {userSkill.years && ` • ${userSkill.years} years`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getSkillLevelColor(userSkill.level)}`} />
                        <span className="text-sm font-medium">{userSkill.level}/9</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSkill(userSkill.skill_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {userSkills?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No skills added yet. Add your first skill above!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {!isAdmin && <TabsContent value="my-certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Professional Certifications
              </CardTitle>
              <CardDescription>
                Track your professional certifications and credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddCertificationDialog onAddCertification={handleAddCertification} />
              
              <div className="space-y-3">
                {userCertifications?.map((cert) => (
                  <div key={cert.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{cert.name}</h4>
                        {cert.authority && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {cert.authority}
                          </div>
                        )}
                        {cert.credential_id && (
                          <div className="text-sm text-muted-foreground">
                            ID: {cert.credential_id}
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {cert.issued_on && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Issued: {new Date(cert.issued_on).toLocaleDateString()}
                            </div>
                          )}
                          {cert.expires_on && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires: {new Date(cert.expires_on).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCertification.mutateAsync({ id: cert.id, userId: cert.user_id })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {userCertifications?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No certifications added yet. Add your first certification above!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {isAdmin && (
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Employees by Skills
                </CardTitle>
                <CardDescription>
                  Find employees with specific skills and expertise levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="skill-search" className="flex items-center gap-2">
                        Skill Name(s)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Search for multiple skills by separating them with commas (e.g., "Python, JavaScript, React")</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="skill-search"
                          placeholder="Search skills... (e.g., Python, JavaScript)"
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setSkillSearchQuery(searchInput);
                            }
                          }}
                        />
                        <Button
                          onClick={() => setSkillSearchQuery(searchInput)}
                          disabled={!searchInput.trim()}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Minimum Level: {minLevel}</Label>
                      <Slider
                        value={[minLevel]}
                        onValueChange={(value) => setMinLevel(value[0])}
                        max={9}
                        min={0}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Search Results */}
                {skillSearchTerms.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Search Results for "{skillSearchTerms.join(', ')}" (Level {minLevel}+)
                    </h3>
                    
                    {searchLoading ? (
                      <div className="text-center py-4">Searching...</div>
                    ) : searchResults && searchResults.length > 0 ? (
                      <div className="space-y-3">
                        {searchResults.map((result: any) => (
                          <div key={`${result.user_id}-${result.skill_name}`} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="font-medium flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  {result.user?.full_name || 'Unknown'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {result.user?.email} • {result.user?.department}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  📍 {result.user?.location}
                                </div>
                                <div className="mt-2">
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Code className="h-3 w-3" />
                                    {result.skill_name}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getSkillLevelColor(result.level)}`} />
                                  <span className="font-medium">Level {result.level}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {getSkillLevelText(result.level)}
                                </div>
                                {result.years && (
                                  <div className="text-xs text-muted-foreground">
                                    {result.years} years exp.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No employees found with skills matching "{skillSearchTerms.join(', ')}" at level {minLevel} or higher
                      </div>
                    )}
                  </div>
                )}
                
                {skillSearchTerms.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Enter skill name(s) above to search for employees with those skills
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="manage-skills" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Manage Employee Skills
                </CardTitle>
                <CardDescription>
                  Add and manage skills for any employee
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Employee Selection */}
                <div>
                  <Label htmlFor="employee-select">Select Employee</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEmployees?.map((employee) => (
                        <SelectItem key={employee.user_id} value={employee.user_id}>
                          {employee.full_name} ({employee.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUserId && (
                  <>
                    <AddSkillDialog 
                      skillsCatalog={skillsCatalog || []}
                      userSkills={userSkills || []}
                      onAddSkill={handleAddSkill}
                      onAddNewSkill={(skill) => addSkill.mutateAsync({ ...skill, category: skill.category || null })}
                    />
                    
                    <div className="space-y-3">
                      {userSkills?.map((userSkill) => (
                        <div key={userSkill.skill_id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{userSkill.skill?.category}</Badge>
                            <div>
                              <div className="font-medium">{userSkill.skill?.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Level {userSkill.level} • {getSkillLevelText(userSkill.level)}
                                {userSkill.years && ` • ${userSkill.years} years`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${getSkillLevelColor(userSkill.level)}`} />
                              <span className="text-sm font-medium">{userSkill.level}/9</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSkill(userSkill.skill_id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {userSkills?.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No skills added yet for this employee.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="manage-certifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Manage Employee Certifications
                </CardTitle>
                <CardDescription>
                  Add and manage certifications for any employee
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Employee Selection */}
                <div>
                  <Label htmlFor="employee-select-cert">Select Employee</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {allEmployees?.map((employee) => (
                        <SelectItem key={employee.user_id} value={employee.user_id}>
                          {employee.full_name} ({employee.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUserId && (
                  <>
                    <AddCertificationDialog onAddCertification={handleAddCertification} />
                    
                    <div className="space-y-3">
                      {userCertifications?.map((cert) => (
                        <div key={cert.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{cert.name}</h4>
                              {cert.authority && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Building className="h-3 w-3" />
                                  {cert.authority}
                                </div>
                              )}
                              {cert.credential_id && (
                                <div className="text-sm text-muted-foreground">
                                  ID: {cert.credential_id}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {cert.issued_on && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Issued: {new Date(cert.issued_on).toLocaleDateString()}
                                  </div>
                                )}
                                {cert.expires_on && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Expires: {new Date(cert.expires_on).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCertification.mutateAsync({ id: cert.id, userId: cert.user_id })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {userCertifications?.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No certifications added yet for this employee.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AddSkillDialog({ 
  skillsCatalog, 
  userSkills, 
  onAddSkill, 
  onAddNewSkill 
}: {
  skillsCatalog: any[];
  userSkills: any[];
  onAddSkill: (skillId: string, level: number, years?: number) => void;
  onAddNewSkill: (skill: { name: string; category?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [level, setLevel] = useState([5]);
  const [years, setYears] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('');

  const availableSkills = skillsCatalog.filter(
    skill => !userSkills.some(us => us.skill_id === skill.id)
  );

  const handleSubmit = () => {
    if (selectedSkillId) {
      onAddSkill(selectedSkillId, level[0], parseFloat(years) || 0);
      setOpen(false);
      setSelectedSkillId('');
      setLevel([5]);
      setYears('');
    }
  };

  const handleAddNewSkill = () => {
    if (newSkillName) {
      onAddNewSkill({
        name: newSkillName,
        category: newSkillCategory || undefined,
      });
      setNewSkillName('');
      setNewSkillCategory('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Skill
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Technical Skill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="skill-select">Select Skill</Label>
            <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a skill" />
              </SelectTrigger>
              <SelectContent>
                {availableSkills.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.name} {skill.category && `(${skill.category})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-skill">Or Add New Skill</Label>
              <Input
                id="new-skill"
                placeholder="Skill name"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-category">Category</Label>
              <Input
                id="new-category"
                placeholder="e.g., Frontend, Backend"
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
              />
            </div>
          </div>

          {newSkillName && (
            <Button variant="outline" onClick={handleAddNewSkill} className="w-full">
              Add "{newSkillName}" to Skills Catalog
            </Button>
          )}

          {selectedSkillId && (
            <>
              <div>
                <Label>Skill Level: {level[0]}</Label>
                <Slider
                  value={level}
                  onValueChange={setLevel}
                  max={9}
                  min={0}
                  step={1}
                  className="mt-2"
                />
                <div className="text-sm text-muted-foreground mt-1">
                  0 = No experience, 9 = World-class expert
                </div>
              </div>

              <div>
                <Label htmlFor="years">Years of Experience (optional)</Label>
                <Input
                  id="years"
                  type="number"
                  placeholder="0"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                Add Skill
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddCertificationDialog({ 
  onAddCertification 
}: {
  onAddCertification: (cert: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [authority, setAuthority] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [expiresOn, setExpiresOn] = useState('');

  const handleSubmit = () => {
    if (name) {
      onAddCertification({
        name,
        authority: authority || null,
        credential_id: credentialId || null,
        issued_on: issuedOn || null,
        expires_on: expiresOn || null,
      });
      setOpen(false);
      setName('');
      setAuthority('');
      setCredentialId('');
      setIssuedOn('');
      setExpiresOn('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Certification
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Professional Certification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cert-name">Certification Name</Label>
            <Input
              id="cert-name"
              placeholder="e.g., AWS Solutions Architect"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cert-authority">Issuing Authority</Label>
            <Input
              id="cert-authority"
              placeholder="e.g., Amazon Web Services"
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cert-id">Credential ID</Label>
            <Input
              id="cert-id"
              placeholder="Certificate number or ID"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issued-date">Issued Date</Label>
              <Input
                id="issued-date"
                type="date"
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="expires-date">Expiry Date</Label>
              <Input
                id="expires-date"
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!name}>
            Add Certification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}