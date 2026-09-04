import React, { useState, useEffect } from 'react';
import { SAMPLE_PACKS } from './data/samplePacks';
import { QuestionPack, GameSettings } from './types';
import { Navbar } from './components/Navbar';
import { PackExplorer } from './components/PackExplorer';
import { GameEngine } from './components/game/GameEngine';
import { EmbedModal } from './components/embed/EmbedModal';
import { PackEditorModal } from './components/editor/PackEditorModal';

const LOCAL_STORAGE_KEY = 'edudrop_custom_packs';

export default function App() {
  const [packs, setPacks] = useState<QuestionPack[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const customPacks = JSON.parse(saved);
          return [...SAMPLE_PACKS, ...customPacks];
        }
      } catch {
        // ignore
      }
    }
    return SAMPLE_PACKS;
  });

  const [activePack, setActivePack] = useState<QuestionPack>(SAMPLE_PACKS[0]);
  const [activeView, setActiveView] = useState<'explorer' | 'game' | 'editor'>('explorer');
  const [isEmbeddedMode, setIsEmbeddedMode] = useState<boolean>(false);

  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    timerEnabled: false,
    timePerQuestion: 0,
    instantFeedback: true,
    allowRetry: true,
    shuffleQuestions: false,
    themeColor: 'indigo',
  });

  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState<boolean>(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [editingPack, setEditingPack] = useState<QuestionPack | null>(null);

  // Check URL parameters on mount (e.g. ?embedded=true&pack=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const embeddedParam = params.get('embedded');
      const packIdParam = params.get('pack');

      if (packIdParam) {
        const matched = packs.find((p) => p.id === packIdParam);
        if (matched) {
          setActivePack(matched);
          setActiveView('game');
        }
      }

      if (embeddedParam === 'true') {
        setIsEmbeddedMode(true);
        setActiveView('game');
      }
    }
  }, []);

  const handleSelectPack = (pack: QuestionPack) => {
    setActivePack(pack);
    setActiveView('game');
  };

  const handleEditPack = (pack: QuestionPack) => {
    setEditingPack(pack);
    setIsEditorModalOpen(true);
  };

  const handleCreateNewPack = () => {
    setEditingPack(null);
    setIsEditorModalOpen(true);
  };

  const handleSavePack = (newPack: QuestionPack) => {
    setPacks((prev) => {
      const index = prev.findIndex((p) => p.id === newPack.id);
      let updatedList: QuestionPack[];
      if (index >= 0) {
        updatedList = [...prev];
        updatedList[index] = newPack;
      } else {
        updatedList = [newPack, ...prev];
      }

      // Save custom non-sample packs to localStorage
      try {
        const customOnly = updatedList.filter(
          (p) => !SAMPLE_PACKS.some((sp) => sp.id === p.id)
        );
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customOnly));
      } catch {
        // ignore
      }

      return updatedList;
    });

    setActivePack(newPack);
    setActiveView('game');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as QuestionPack;
        if (parsed.id && parsed.title && Array.isArray(parsed.questions)) {
          handleSavePack(parsed);
        } else {
          alert('File JSON không đúng định dạng QuestionPack của EduDrop.');
        }
      } catch (err) {
        alert('Không thể đọc file JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden font-sans text-white flex flex-col selection:bg-blue-500/30 selection:text-blue-200"
      style={{
        background: 'radial-gradient(circle at 0% 0%, #1e1b4b 0%, #060814 60%, #020617 100%)',
      }}
    >
      {/* Frosted Ambient Glow Orbs */}
      <div className="pointer-events-none fixed top-[-10%] right-[-10%] w-[550px] h-[550px] bg-blue-500/15 rounded-full blur-[140px] z-0" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[-10%] w-[550px] h-[550px] bg-purple-500/15 rounded-full blur-[140px] z-0" />
      <div className="pointer-events-none fixed top-[40%] left-[50%] -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-[160px] z-0" />

      {/* Show Navbar unless running inside an embedded iframe */}
      {!isEmbeddedMode && (
        <div className="relative z-20">
          <Navbar
            activeView={activeView}
            onNavigate={(view) => setActiveView(view)}
            onOpenEmbed={() => setIsEmbedModalOpen(true)}
            onCreateNew={handleCreateNewPack}
            settings={settings}
            onToggleSound={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
          />
        </div>
      )}

      {/* Main View Area */}
      <main className={`relative z-10 flex-1 ${isEmbeddedMode ? 'p-2 sm:p-4' : 'p-4 md:p-8 max-w-6xl w-full mx-auto'}`}>
        {activeView === 'explorer' && (
          <PackExplorer
            packs={packs}
            onSelectPack={handleSelectPack}
            onEditPack={handleEditPack}
            onCreateNewPack={handleCreateNewPack}
            onOpenEmbed={(pack) => {
              setActivePack(pack);
              setIsEmbedModalOpen(true);
            }}
            onImportJson={handleImportJson}
          />
        )}

        {activeView === 'game' && (
          <GameEngine
            pack={activePack}
            settings={settings}
            onUpdateSettings={(newS) => setSettings((prev) => ({ ...prev, ...newS }))}
            onBackToMenu={() => setActiveView('explorer')}
            onOpenEmbedModal={() => setIsEmbedModalOpen(true)}
          />
        )}
      </main>

      {/* Embed & Export Modal */}
      <EmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
        currentPack={activePack}
        settings={settings}
      />

      {/* Pack Creator / Editor Modal */}
      <PackEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        onSavePack={handleSavePack}
        initialPack={editingPack}
      />
    </div>
  );
}
