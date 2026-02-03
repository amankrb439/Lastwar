
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  Construction, 
  Crosshair, 
  Cpu, 
  MessageSquareCode, 
  Zap, 
  ChevronRight,
  RefreshCcw,
  Skull,
  Radio,
  Sword,
  Save,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { GameState, ResourceType, Building, Unit, Mission, Resources } from './types';
import { INITIAL_RESOURCES, INITIAL_BUILDINGS, INITIAL_UNITS } from './constants';
import { getTacticalAdvice, generateMissionDescription } from './services/geminiService';

const SAVE_KEY = 'last_war_save_data';

const App: React.FC = () => {
  // Load initial state from local storage or use defaults
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure log exists
        if (!parsed.log) parsed.log = ["Command link re-established."];
        return parsed;
      } catch (e) {
        console.error("Failed to parse save data", e);
      }
    }
    return {
      resources: INITIAL_RESOURCES,
      buildings: INITIAL_BUILDINGS,
      units: INITIAL_UNITS,
      log: ["Command established. Welcome, Commander."],
      day: 1
    };
  });

  const [activeTab, setActiveTab] = useState<'base' | 'military' | 'missions' | 'ai'>('base');
  const [aiAdvice, setAiAdvice] = useState<string>("Standby for tactical link...");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [saveNotify, setSaveNotify] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);

  // Auto-save game state
  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    setSaveNotify(true);
    const timeout = setTimeout(() => setSaveNotify(false), 2000);
    return () => clearTimeout(timeout);
  }, [gameState]);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0; // Newest at top
    }
  }, [gameState.log]);

  // Resource Production Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState(prev => {
        const nextResources = { ...prev.resources };
        prev.buildings.forEach(b => {
          if (b.production) {
            Object.entries(b.production).forEach(([res, amount]) => {
              const r = res as ResourceType;
              if (typeof amount === 'number') {
                nextResources[r] += Math.floor(amount * b.level);
              }
            });
          }
        });
        return { ...prev, resources: nextResources };
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Day Counter and Event Generator
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState(prev => {
        const nextDay = prev.day + 1;
        // Random daily events
        if (nextDay % 5 === 0) {
          addLog(`COMM HQ: It is now Day ${nextDay}. Intelligence reports increased hostile activity.`, "warning");
        }
        return { ...prev, day: nextDay };
      });
    }, 60000); // 1 minute = 1 day
    return () => clearInterval(timer);
  }, []);

  const replenishMissions = useCallback(async (manual = false) => {
    if (isScanning) return;
    setIsScanning(true);
    const newMissions: Mission[] = [];
    const count = 3 - missions.length;
    
    if (count <= 0) {
      if (manual) addLog("Scanners report no new unique targets in range.", "info");
      setIsScanning(false);
      return;
    }

    // Use current day to scale difficulty
    const dayFactor = Math.floor(gameState.day / 10);

    for (let i = 0; i < count; i++) {
      const diff = Math.floor(Math.random() * (5 + dayFactor)) + 1;
      const desc = await generateMissionDescription(diff);
      newMissions.push({
        id: `m-${Date.now()}-${i}`,
        title: `Operation: ${['Shadow', 'Iron', 'Nova', 'Cinder', 'Apex', 'Zero'][Math.floor(Math.random()*6)]} ${['Strike', 'Rain', 'Edge', 'Ghost', 'Dawn', 'Verdict'][Math.floor(Math.random()*6)]}`,
        difficulty: diff,
        enemyPower: diff * 50 + (gameState.day * 2),
        rewards: { 
          [ResourceType.GOLD]: diff * 150 + (gameState.day * 10), 
          [ResourceType.STEEL]: diff * 75 + (gameState.day * 5), 
          [ResourceType.TECH]: diff * 10 + (gameState.day * 1) 
        },
        description: desc
      });
    }
    setMissions(prev => [...prev, ...newMissions]);
    setIsScanning(false);
    if (manual) addLog("Target acquisition successful. Tactical options updated.", "success");
  }, [missions.length, isScanning, gameState.day]);

  // Initial and periodical mission replenishment
  useEffect(() => {
    replenishMissions();
    const timer = setInterval(() => replenishMissions(), 45000);
    return () => clearInterval(timer);
  }, [replenishMissions]);

  const addLog = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const prefix = type === 'success' ? '✓ ' : type === 'error' ? '✖ ' : type === 'warning' ? '⚠ ' : '▶ ';
    setGameState(prev => ({
      ...prev,
      log: [`[${timestamp}] ${prefix}${msg}`, ...prev.log].slice(0, 100) 
    }));
  };

  const resetGame = () => {
    if (confirm("CRITICAL: This will wipe all command data and restart from Day 1. Proceed?")) {
      localStorage.removeItem(SAVE_KEY);
      window.location.reload();
    }
  };

  const upgradeBuilding = (buildingId: string) => {
    const building = gameState.buildings.find(b => b.id === buildingId);
    if (!building) return;

    const cmdCenter = gameState.buildings.find(b => b.type === 'command');
    if (building.type !== 'command' && cmdCenter && building.level >= cmdCenter.level) {
      addLog(`Restriction: Command Center Level ${cmdCenter.level + 1} required for further base expansion.`, "warning");
      return;
    }

    const cost = getBuildingCost(building);
    const canAfford = Object.entries(cost).every(([res, amount]) => gameState.resources[res as ResourceType] >= (amount || 0));

    if (canAfford) {
      setGameState(prev => {
        const nextResources = { ...prev.resources };
        Object.entries(cost).forEach(([res, amount]) => {
          if (typeof amount === 'number') {
            nextResources[res as ResourceType] -= amount;
          }
        });
        const nextBuildings = prev.buildings.map(b => b.id === buildingId ? { ...b, level: b.level + 1 } : b);
        return { ...prev, resources: nextResources, buildings: nextBuildings };
      });
      addLog(`Infrastructure Upgrade: ${building.name} reached Level ${building.level + 1}`, "success");
    } else {
      addLog(`Insufficient logistics for ${building.name} upgrade. Priority resource acquisition needed.`, "error");
    }
  };

  const trainUnit = (unitId: string) => {
    const unit = gameState.units.find(u => u.id === unitId);
    if (!unit) return;

    const barracks = gameState.buildings.find(b => b.id === 'b5');
    const unitIndex = gameState.units.indexOf(unit);
    if (!barracks || barracks.level < unitIndex + 1) {
       addLog(`War Room Level ${unitIndex + 1} required for ${unit.name} blueprints.`, "warning");
       return;
    }

    const canAfford = Object.entries(unit.cost).every(([res, amount]) => gameState.resources[res as ResourceType] >= (amount || 0));

    if (canAfford) {
      setGameState(prev => {
        const nextResources = { ...prev.resources };
        Object.entries(unit.cost).forEach(([res, amount]) => {
          if (typeof amount === 'number') {
            nextResources[res as ResourceType] -= amount;
          }
        });
        const nextUnits = prev.units.map(u => u.id === unitId ? { ...u, count: u.count + 1 } : u);
        return { ...prev, resources: nextResources, units: nextUnits };
      });
      addLog(`Deployment: 1x ${unit.name} unit added to roster.`, "info");
    } else {
      addLog(`Recruitment halted: Food or Steel shortage. Resolve logistics first.`, "error");
    }
  };

  const startMission = (missionId: string) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;

    const playerPower = gameState.units.reduce((acc, u) => acc + u.power * u.count, 0);
    if (playerPower <= 0) {
      addLog("Cannot launch expedition without military personnel.", "error");
      return;
    }

    // Scaling win chance
    const winChance = Math.min(0.98, Math.max(0.05, playerPower / (mission.enemyPower * 1.5)));
    const roll = Math.random();

    if (roll < winChance) {
      setGameState(prev => {
        const nextResources = { ...prev.resources };
        Object.entries(mission.rewards).forEach(([res, amount]) => {
          if (typeof amount === 'number') {
            nextResources[res as ResourceType] += amount;
          }
        });
        return { ...prev, resources: nextResources };
      });
      addLog(`BATTLE REPORT: Operation ${mission.title} was a resounding success. Loot salvaged.`, "success");
    } else {
      // Failure logic - casualties are random but proportional to risk
      const lossRate = 0.6 + (Math.random() * 0.3); // 60% to 90% survivors
      setGameState(prev => {
        const nextUnits = prev.units.map(u => ({ ...u, count: Math.floor(u.count * lossRate) }));
        return { ...prev, units: nextUnits };
      });
      addLog(`BATTLE REPORT: Disaster in ${mission.title}. Severe casualties. Squad decimated.`, "error");
    }

    setMissions(prev => prev.filter(m => m.id !== missionId));
  };

  const getBuildingCost = (b: Building) => {
    const cost: Partial<Record<ResourceType, number>> = {};
    Object.entries(b.baseCost).forEach(([res, amount]) => {
      if (typeof amount === 'number') {
        cost[res as ResourceType] = Math.floor(amount * Math.pow(b.costMultiplier, b.level - 1));
      }
    });
    return cost;
  };

  const handleConsultAi = useCallback(async () => {
    setIsAiLoading(true);
    const advice = await getTacticalAdvice(gameState);
    setAiAdvice(advice);
    setIsAiLoading(false);
  }, [gameState]);

  const playerTotalPower = gameState.units.reduce((acc, u) => acc + u.power * u.count, 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-white font-inter">
      {/* Top Header / Resource Bar */}
      <header className="bg-slate-900/95 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg shadow-lg shadow-orange-900/40">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-orbitron font-bold tracking-tighter">TACTICAL COMMAND</h1>
              {saveNotify && <Save className="w-3 h-3 text-green-500 animate-pulse" />}
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Wasteland Sector-7 • Day {gameState.day}</p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto no-scrollbar py-1 px-3 bg-slate-800/40 rounded-2xl border border-slate-700/50">
          <ResourceItem icon={<TrendingUp className="w-4 h-4 text-yellow-500" />} label="Gold" value={gameState.resources.Gold} />
          <ResourceItem icon={<Zap className="w-4 h-4 text-green-500" />} label="Food" value={gameState.resources.Food} />
          <ResourceItem icon={<Construction className="w-4 h-4 text-blue-500" />} label="Steel" value={gameState.resources.Steel} />
          <ResourceItem icon={<Cpu className="w-4 h-4 text-purple-500" />} label="Tech" value={gameState.resources.Tech} />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 shadow-inner">
            <Sword className="w-4 h-4 text-red-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Combat Power</span>
              <span className="text-sm font-bold font-orbitron">{playerTotalPower.toLocaleString()}</span>
            </div>
          </div>
          <button 
            onClick={resetGame}
            title="Wipe Save Data"
            className="p-2 text-slate-600 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <nav className="w-16 md:w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col">
          <div className="flex-1 py-4 flex flex-col gap-1">
            <NavButton active={activeTab === 'base'} onClick={() => setActiveTab('base')} icon={<Construction />} label="Base Hub" />
            <NavButton active={activeTab === 'military'} onClick={() => setActiveTab('military')} icon={<Users />} label="Garrison" />
            <NavButton active={activeTab === 'missions'} onClick={() => setActiveTab('missions')} icon={<Crosshair />} label="Expeditions" />
            <NavButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<MessageSquareCode />} label="AI Advisor" />
          </div>
          <div className="p-4 border-t border-slate-800">
             <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase mb-2">
               <span>Progression</span>
               <span>{gameState.day}d</span>
             </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-orange-600 transition-all duration-1000" style={{ width: `${Math.min(100, (gameState.day / 100) * 100)}%` }} />
            </div>
          </div>
        </nav>

        {/* Dynamic Content Pane */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950 relative">
          
          <div className="max-w-5xl mx-auto space-y-6">
            {activeTab === 'base' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-300">
                {gameState.buildings.map(b => (
                  <BuildingCard 
                    key={b.id} 
                    building={b} 
                    cost={getBuildingCost(b)} 
                    onUpgrade={() => upgradeBuilding(b.id)}
                    canAfford={Object.entries(getBuildingCost(b)).every(([res, amount]) => gameState.resources[res as ResourceType] >= (amount || 0))}
                  />
                ))}
              </div>
            )}

            {activeTab === 'military' && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-slate-900/80 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center gap-3 mb-8">
                    <Users className="w-8 h-8 text-orange-500" />
                    <div>
                      <h2 className="text-3xl font-orbitron font-bold tracking-tighter">Combat Academy</h2>
                      <p className="text-slate-500 text-xs uppercase font-bold tracking-[0.2em] mt-1">Upgrade War Room to unlock specialized units</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {gameState.units.map(u => (
                      <UnitCard 
                        key={u.id} 
                        unit={u} 
                        onTrain={() => trainUnit(u.id)}
                        canAfford={Object.entries(u.cost).every(([res, amount]) => gameState.resources[res as ResourceType] >= (amount || 0))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'missions' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
                  <div>
                    <h2 className="text-2xl font-orbitron font-bold">Recon Link</h2>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Searching Sector-7 for Hostile Bases and Caches</p>
                  </div>
                  <button 
                    onClick={() => replenishMissions(true)} 
                    disabled={isScanning || missions.length >= 3}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:opacity-50 rounded-xl transition-all border border-blue-400/30 text-sm font-black active:scale-95 shadow-lg shadow-blue-900/20"
                  >
                    <Radio className={`w-4 h-4 ${isScanning ? 'animate-pulse text-white' : ''}`} />
                    {isScanning ? 'Syncing...' : 'Scan Area'}
                  </button>
                </div>
                {missions.length > 0 ? (
                  <div className="grid gap-4">
                    {missions.map(m => (
                      <MissionItem 
                        key={m.id} 
                        mission={m} 
                        playerPower={playerTotalPower}
                        onStart={() => startMission(m.id)} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                    <Skull className="w-16 h-16 text-slate-800 mx-auto mb-4 opacity-50" />
                    <p className="text-slate-600 font-medium text-lg italic">Wasteland silent. Launch scan to find objectives.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-slate-900/80 border border-slate-800 p-10 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8">
                    <Cpu className="w-48 h-48 text-blue-500/5 rotate-12 transition-transform group-hover:rotate-0 duration-1000" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-10">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/20">
                        <MessageSquareCode className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-orbitron font-bold tracking-tight">Aegis Strategic Node</h2>
                        <span className="text-xs text-blue-400 uppercase tracking-[0.3em] font-black">AI Command Link Online</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950/60 p-8 rounded-3xl border border-slate-800 text-lg leading-relaxed text-slate-300 font-light italic mb-10 min-h-[160px] shadow-inner relative overflow-hidden">
                       <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500 rounded-full" />
                      {isAiLoading ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-8">
                          <RefreshCcw className="w-10 h-10 text-blue-500 animate-spin" />
                          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Compiling Situation Brief...</span>
                        </div>
                      ) : (
                        <p className="animate-in fade-in duration-700">"{aiAdvice}"</p>
                      )}
                    </div>

                    <button 
                      onClick={handleConsultAi}
                      disabled={isAiLoading}
                      className="w-full md:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:cursor-not-allowed transition-all rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 active:scale-95"
                    >
                      {isAiLoading ? 'Analyzing...' : 'Request Intelligence Brief'}
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Event Log */}
        <aside className="hidden lg:flex w-96 bg-slate-900/90 border-l border-slate-800 flex-col backdrop-blur-sm z-40">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Encrypted Log</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Secure Link</span>
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            </div>
          </div>
          <div ref={logRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px] leading-relaxed scroll-smooth">
            {gameState.log.map((entry, idx) => {
              const isSuccess = entry.includes('✓');
              const isError = entry.includes('✖');
              const isWarning = entry.includes('⚠');
              return (
                <div key={idx} className={`p-3 rounded-lg border border-slate-800/30 transition-all hover:bg-slate-800/40 
                  ${isSuccess ? 'bg-green-500/5 text-green-400/80 border-green-500/10' : 
                    isError ? 'bg-red-500/5 text-red-400/80 border-red-500/10' : 
                    isWarning ? 'bg-yellow-500/5 text-yellow-400/80 border-yellow-500/10' : 
                    'bg-slate-800/20 text-slate-500'}`}>
                  {entry}
                </div>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
};

// --- Sub-components ---

const ResourceItem: React.FC<{ icon: React.ReactNode, label: string, value: number }> = ({ icon, label, value }) => {
  const isDanger = label === 'Food' && value < 50;
  return (
    <div className={`flex items-center gap-3 min-w-max px-2 py-1 rounded-lg transition-colors ${isDanger ? 'bg-red-900/20 animate-pulse' : ''}`}>
      <div className="p-1.5 bg-slate-900/80 rounded-lg border border-slate-700/50 shadow-sm">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] uppercase font-black text-slate-500 leading-none mb-1 tracking-tighter">{label}</span>
        <span className={`text-sm font-orbitron font-bold leading-none tabular-nums ${isDanger ? 'text-red-500' : 'text-white'}`}>{value.toLocaleString()}</span>
      </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactElement, label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 transition-all relative group
      ${active ? 'bg-orange-600/5 text-orange-500' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'}`}
  >
    {active && <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-orange-600 rounded-r-full shadow-lg shadow-orange-600/50" />}
    <span className={`${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(234,88,12,0.4)]' : 'group-hover:scale-110'} transition-transform duration-300`}>
      {React.cloneElement(icon as React.ReactElement<any>, { size: 22 })}
    </span>
    <span className={`hidden md:block font-bold text-xs uppercase tracking-widest transition-all ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

const BuildingCard: React.FC<{ building: Building, cost: Partial<Resources>, onUpgrade: () => void, canAfford: boolean }> = ({ building, cost, onUpgrade, canAfford }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-7 flex flex-col h-full group hover:border-slate-600 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 backdrop-blur-sm">
    <div className="flex justify-between items-start mb-5">
      <h3 className="font-orbitron font-bold text-lg text-slate-100 group-hover:text-orange-400 transition-colors">{building.name}</h3>
      <span className="bg-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black text-orange-400 border border-slate-700 shadow-sm">LV {building.level}</span>
    </div>
    <p className="text-xs text-slate-500 mb-6 flex-1 italic font-medium leading-relaxed">"{building.description}"</p>
    
    {building.production && (
      <div className="mb-6 space-y-3">
        <p className="text-[9px] uppercase font-black text-slate-600 tracking-[0.2em]">Daily Output</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(building.production).map(([res, amt]) => (
            <span key={res} className="text-[10px] font-bold bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/80 flex items-center gap-2 group-hover:border-slate-700 transition-colors">
              <div className={`w-2 h-2 rounded-full shadow-sm ${res === 'Gold' ? 'bg-yellow-500 shadow-yellow-500/20' : res === 'Food' ? 'bg-green-500 shadow-green-500/20' : 'bg-blue-500 shadow-blue-500/20'}`} />
              +{(typeof amt === 'number' ? Math.floor(amt * building.level) : 0)}
            </span>
          ))}
        </div>
      </div>
    )}

    <div className="space-y-4 mt-auto">
      <div className="flex flex-wrap gap-2">
        {Object.entries(cost).map(([res, amount]) => (
          <div key={res} className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 border transition-colors ${canAfford ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-red-900/30 text-red-500 bg-red-950/20'}`}>
            <span className="opacity-50">{res}</span>
            <span className="text-slate-100">{amount}</span>
          </div>
        ))}
      </div>
      <button 
        onClick={onUpgrade}
        className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl
          ${canAfford 
            ? 'bg-slate-100 text-slate-900 hover:bg-orange-500 hover:text-white active:scale-[0.98]' 
            : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'}`}
      >
        <Construction className="w-4 h-4" />
        Upgrade Building
      </button>
    </div>
  </div>
);

const UnitCard: React.FC<{ unit: Unit, onTrain: () => void, canAfford: boolean }> = ({ unit, onTrain, canAfford }) => (
  <div className="bg-slate-950/40 border border-slate-800 p-7 rounded-[2rem] space-y-5 hover:border-slate-600 transition-all duration-300 group hover:shadow-xl">
    <div className="flex justify-between items-center">
      <h4 className="font-bold text-slate-100 uppercase tracking-widest text-sm group-hover:text-blue-400 transition-colors">{unit.name}</h4>
      <div className="bg-slate-900 px-3 py-1 rounded-full border border-slate-800 text-xs font-bold font-orbitron text-orange-500">
        {unit.count}
      </div>
    </div>
    <div className="flex items-center gap-3 text-[10px] font-black text-blue-400 bg-blue-500/5 w-max px-3 py-1.5 rounded-lg border border-blue-500/10 uppercase tracking-widest">
      <Sword className="w-3 h-3" />
      Rating: {unit.power}
    </div>
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap gap-2">
        {Object.entries(unit.cost).map(([res, amt]) => (
          <span key={res} className="text-[9px] font-bold bg-slate-900 px-2 py-1 rounded-md text-slate-500 border border-slate-800">
            {res}: <span className="text-slate-300">{amt}</span>
          </span>
        ))}
      </div>
      <button 
        onClick={onTrain}
        className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all shadow-lg
          ${canAfford ? 'bg-orange-600 text-white hover:bg-orange-500 active:scale-95 shadow-orange-900/20' : 'bg-slate-800 text-slate-600 opacity-50'}`}
      >
        Enlist Personnel
      </button>
    </div>
  </div>
);

const MissionItem: React.FC<{ mission: Mission, playerPower: number, onStart: () => void }> = ({ mission, playerPower, onStart }) => {
  const winChance = Math.min(100, Math.floor((playerPower / (mission.enemyPower * 1.5)) * 100));
  const chanceColor = winChance >= 90 ? 'text-green-500' : winChance >= 60 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-8 group hover:bg-slate-800/60 transition-all duration-300 backdrop-blur-sm border-l-4 border-l-blue-600/20 hover:border-l-blue-600">
      <div className="w-full md:w-32 flex flex-col items-center justify-center bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-inner">
        <span className="text-[9px] uppercase font-black text-slate-600 mb-1 tracking-widest">Risk</span>
        <span className={`text-3xl font-orbitron font-bold ${mission.difficulty > 4 ? 'text-red-500' : 'text-green-500'}`}>{mission.difficulty}</span>
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors uppercase tracking-tight">
            {mission.title}
          </h3>
          {mission.difficulty >= 6 && (
            <span className="flex items-center gap-1 text-[8px] bg-red-600/20 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm">
              <AlertTriangle className="w-2.5 h-2.5" /> Extreme Risk
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 font-light leading-relaxed max-w-2xl italic">"{mission.description}"</p>
        
        <div className="flex flex-wrap items-center gap-6 mt-4">
          <div className="flex gap-4">
             <div className="flex flex-col">
               <span className="text-[8px] uppercase font-bold text-slate-600 tracking-widest">Intelligence</span>
               <span className="text-[10px] font-bold text-slate-400">Enemy Power: {mission.enemyPower}</span>
             </div>
             <div className="flex flex-col">
               <span className="text-[8px] uppercase font-bold text-slate-600 tracking-widest">Success Probability</span>
               <span className={`text-[10px] font-bold font-orbitron ${chanceColor}`}>{winChance}%</span>
             </div>
          </div>
          <div className="h-4 w-px bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-black uppercase text-slate-600 tracking-widest">Bounty:</span>
            <div className="flex gap-2">
              {Object.entries(mission.rewards).map(([res, amt]) => (
                <span key={res} className="text-[9px] font-bold text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                  {res.charAt(0)}: {amt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-56">
        <button 
          onClick={onStart}
          className="w-full py-5 px-8 bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 shadow-2xl group-hover:shadow-blue-600/10"
        >
          <Crosshair className="w-4 h-4" />
          Engage
        </button>
      </div>
    </div>
  );
};

export default App;
