"use client";

import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Filter,
  Star,
  Calendar,
  Building2,
  AlertCircle,
  Tag,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Lightbulb
} from "lucide-react";
import { AddSuggestionModal } from "@/components/add-suggestion-modal";

interface Feedback {
  id: string;
  comment: string;
  rating: number;
  date: string;
  hotel: string;
  source: string;
  problem?: string;
  problem_detail?: string; // detalhe curto e objetivo do problema
  keyword?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  apartamento?: string;
  sector?: string;
  // Campos de sugestão
  has_suggestion?: boolean;
  suggestion_type?: 'only' | 'mixed' | 'none';
  suggestion_summary?: string;
}

interface EnhancedFeedbackViewerProps {
  feedbacks: Feedback[];
  title?: string;
  showFilters?: boolean;
}

export const EnhancedFeedbackViewer: React.FC<EnhancedFeedbackViewerProps> = ({
  feedbacks,
  title = "Feedbacks",
  showFilters = true
}) => {
  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('all');
  const [selectedHotel, setSelectedHotel] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeView, setActiveView] = useState('list');
  const [feedbacksWithManualSuggestions, setFeedbacksWithManualSuggestions] = useState<Feedback[]>(feedbacks);

  // Função para lidar com sugestões adicionadas manualmente
  const handleSuggestionAdded = (feedbackId: string, suggestion: string, suggestionType: 'only' | 'mixed') => {
    setFeedbacksWithManualSuggestions(prev => 
      prev.map(feedback => 
        feedback.id === feedbackId 
          ? {
              ...feedback,
              has_suggestion: true,
              suggestion_type: suggestionType,
              suggestion_summary: suggestion
            }
          : feedback
      )
    );
  };

  // Atualizar feedbacks quando a prop mudar
  React.useEffect(() => {
    setFeedbacksWithManualSuggestions(feedbacks);
  }, [feedbacks]);

  // Extrair opções únicas para filtros
  const uniqueHotels = useMemo(() => {
    const hotels = Array.from(new Set(feedbacksWithManualSuggestions.map(f => f.hotel).filter(Boolean)));
    return hotels.sort();
  }, [feedbacksWithManualSuggestions]);

  const uniqueSources = useMemo(() => {
    const sources = Array.from(new Set(feedbacksWithManualSuggestions.map(f => f.source).filter(Boolean)));
    return sources.sort();
  }, [feedbacksWithManualSuggestions]);

  // Filtrar e ordenar feedbacks
  const filteredAndSortedFeedbacks = useMemo(() => {
    let filtered = feedbacksWithManualSuggestions.filter(feedback => {
      const matchesSearch = !searchTerm || 
        feedback.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.hotel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.problem?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.keyword?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRating = selectedRating === 'all' || feedback.rating.toString() === selectedRating;
      const matchesSentiment = selectedSentiment === 'all' || feedback.sentiment === selectedSentiment;
      const matchesHotel = selectedHotel === 'all' || feedback.hotel === selectedHotel;
      const matchesSource = selectedSource === 'all' || feedback.source === selectedSource;
      const matchesSuggestion = selectedSuggestion === 'all' || 
        (selectedSuggestion === 'with' && feedback.has_suggestion) ||
        (selectedSuggestion === 'without' && !feedback.has_suggestion) ||
        (selectedSuggestion === 'only' && feedback.suggestion_type === 'only') ||
        (selectedSuggestion === 'mixed' && feedback.suggestion_type === 'mixed');

      return matchesSearch && matchesRating && matchesSentiment && matchesHotel && matchesSource && matchesSuggestion;
    });

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'rating-desc':
          return b.rating - a.rating;
        case 'rating-asc':
          return a.rating - b.rating;
        case 'hotel':
          return (a.hotel || '').localeCompare(b.hotel || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [feedbacksWithManualSuggestions, searchTerm, selectedRating, selectedSentiment, selectedHotel, selectedSource, selectedSuggestion, sortBy]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedFeedbacks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFeedbacks = filteredAndSortedFeedbacks.slice(startIndex, startIndex + itemsPerPage);

  // Função para obter ícone de sentimento
  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  // Função para obter cor do rating
  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Função para formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRating('all');
    setSelectedSentiment('all');
    setSelectedHotel('all');
    setSelectedSource('all');
    setSelectedSuggestion('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

  // Função para criar badge de sugestão
  const getSuggestionBadge = (feedback: Feedback) => {
    if (!feedback.has_suggestion) return null;
    
    const badgeProps = {
      'only': { variant: 'default' as const, color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Sugestão' },
      'mixed': { variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800 border-purple-200', text: 'Mista' },
      'none': null
    };
    
    const props = badgeProps[feedback.suggestion_type || 'none'];
    if (!props) return null;
    
    return (
      <Badge variant="outline" className={`text-xs ${props.color}`} title={feedback.suggestion_summary || 'Contém sugestão'}>
        <Lightbulb className="h-3 w-3 mr-1" />
        {props.text}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">{title}</h2>
          <Badge variant="secondary" className="px-3 py-1">
            {filteredAndSortedFeedbacks.length} de {feedbacks.length}
          </Badge>
        </div>
        
        {/* Controles de visualização */}
        <Tabs value={activeView} onValueChange={setActiveView} className="w-auto">
          <TabsList>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filtros
              </h3>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar comentários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Rating */}
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Avaliação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as avaliações</SelectItem>
                  <SelectItem value="5">5 estrelas</SelectItem>
                  <SelectItem value="4">4 estrelas</SelectItem>
                  <SelectItem value="3">3 estrelas</SelectItem>
                  <SelectItem value="2">2 estrelas</SelectItem>
                  <SelectItem value="1">1 estrela</SelectItem>
                </SelectContent>
              </Select>

              {/* Sentimento */}
              <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
                <SelectTrigger>
                  <SelectValue placeholder="Sentimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sentimentos</SelectItem>
                  <SelectItem value="positive">Positivo</SelectItem>
                  <SelectItem value="neutral">Neutro</SelectItem>
                  <SelectItem value="negative">Negativo</SelectItem>
                </SelectContent>
              </Select>

              {/* Hotel */}
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger>
                  <SelectValue placeholder="Hotel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os hotéis</SelectItem>
                  {uniqueHotels.map(hotel => (
                    <SelectItem key={hotel} value={hotel}>{hotel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Fonte */}
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  {uniqueSources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sugestões */}
              <Select value={selectedSuggestion} onValueChange={setSelectedSuggestion}>
                <SelectTrigger>
                  <SelectValue placeholder="Sugestões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="with">Com sugestões</SelectItem>
                  <SelectItem value="without">Sem sugestões</SelectItem>
                  <SelectItem value="only">Apenas sugestões</SelectItem>
                  <SelectItem value="mixed">Mistas</SelectItem>
                </SelectContent>
              </Select>

              {/* Ordenação */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Data (mais recente)</SelectItem>
                  <SelectItem value="date-asc">Data (mais antigo)</SelectItem>
                  <SelectItem value="rating-desc">Avaliação (maior)</SelectItem>
                  <SelectItem value="rating-asc">Avaliação (menor)</SelectItem>
                  <SelectItem value="hotel">Hotel (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Conteúdo principal */}
      <TabsContent value={activeView} className="mt-0">
        {activeView === 'list' ? (
          /* Visualização em Lista */
          <Card>
            <ScrollArea className="h-[600px]">
              <div className="p-4 space-y-4">
                {paginatedFeedbacks.map((feedback, index) => (
                  <div key={feedback.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        {getSentimentIcon(feedback.sentiment)}
                        <Badge variant="outline" className="text-xs">
                          {feedback.hotel}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {feedback.source}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(feedback.date)}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-2 leading-relaxed">{feedback.comment}</p>
                    
                    {(feedback.problem || feedback.keyword || feedback.has_suggestion) && (
                      <div className="flex flex-wrap gap-2">
                        {feedback.problem && (
                          <Badge variant="destructive" className="text-xs" title={feedback.problem_detail || feedback.problem}>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {feedback.problem}
                          </Badge>
                        )}
                        {feedback.keyword && (
                          <Badge variant="default" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {feedback.keyword}
                          </Badge>
                        )}
                        {getSuggestionBadge(feedback)}
                      </div>
                    )}
                    
                    {/* Botão para adicionar sugestão quando não há sugestão detectada */}
                    {!feedback.has_suggestion && (
                      <div className="mt-2">
                        <AddSuggestionModal 
                          feedbackId={feedback.id}
                          onSuggestionAdded={handleSuggestionAdded}
                        />
                      </div>
                    )}
                    {feedback.problem_detail && (
                      <p className="text-xs text-muted-foreground mt-1">{feedback.problem_detail}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        ) : (
          /* Visualização em Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedFeedbacks.map((feedback) => (
              <Card key={feedback.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    {getSentimentIcon(feedback.sentiment)}
                  </div>
                  
                  <p className="text-sm text-gray-700 line-clamp-3">{feedback.comment}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-500">
                      <Building2 className="h-3 w-3 mr-1" />
                      {feedback.hotel}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Globe className="h-3 w-3 mr-1" />
                      {feedback.source}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(feedback.date)}
                    </div>
                  </div>
                  
                  {(feedback.problem || feedback.keyword || feedback.has_suggestion) && (
                    <div className="flex flex-wrap gap-1">
                      {feedback.problem && (
                        <Badge variant="destructive" className="text-xs" title={feedback.problem_detail || feedback.problem}>
                          {feedback.problem}
                        </Badge>
                      )}
                      {feedback.keyword && (
                        <Badge variant="default" className="text-xs">
                          {feedback.keyword}
                        </Badge>
                      )}
                      {getSuggestionBadge(feedback)}
                    </div>
                  )}
                  
                  {/* Botão para adicionar sugestão quando não há sugestão detectada */}
                  {!feedback.has_suggestion && (
                    <div className="mt-2">
                      <AddSuggestionModal 
                        feedbackId={feedback.id}
                        onSuggestionAdded={handleSuggestionAdded}
                      />
                    </div>
                  )}
                  
                  {feedback.problem_detail && (
                    <p className="text-xs text-muted-foreground mt-1">{feedback.problem_detail}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedFeedbacks.length)} de {filteredAndSortedFeedbacks.length} resultados
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};