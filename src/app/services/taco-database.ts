export interface TacoFoodItem {
  id: string;
  nome: string;
  categoria: string;
  calorias100g: number;
  proteina100g: number;
  carboidrato100g: number;
  gordura100g: number;
  fibras100g?: number;
}

export const TACO_DATABASE: TacoFoodItem[] = [
  // CEREAIS E DERIVADOS
  { id: 'taco-1', nome: 'Arroz, tipo 1, cozido', categoria: 'Cereais', calorias100g: 128, proteina100g: 2.5, carboidrato100g: 28.1, gordura100g: 0.2, fibras100g: 1.6 },
  { id: 'taco-2', nome: 'Arroz, tipo 1, cru', categoria: 'Cereais', calorias100g: 358, proteina100g: 7.2, carboidrato100g: 78.8, gordura100g: 0.3, fibras100g: 1.6 },
  { id: 'taco-3', nome: 'Arroz, integral, cozido', categoria: 'Cereais', calorias100g: 124, proteina100g: 2.6, carboidrato100g: 25.8, gordura100g: 1.0, fibras100g: 2.7 },
  { id: 'taco-4', nome: 'Arroz, integral, cru', categoria: 'Cereais', calorias100g: 360, proteina100g: 7.9, carboidrato100g: 77.5, gordura100g: 1.9, fibras100g: 4.8 },
  { id: 'taco-5', nome: 'Aveia, flocos, crua', categoria: 'Cereais', calorias100g: 394, proteina100g: 13.9, carboidrato100g: 66.6, gordura100g: 8.5, fibras100g: 9.1 },
  { id: 'taco-6', nome: 'Macarrão, trigo, cozido', categoria: 'Cereais', calorias100g: 102, proteina100g: 3.2, carboidrato100g: 21.0, gordura100g: 0.4, fibras100g: 1.3 },
  { id: 'taco-7', nome: 'Pão, francês', categoria: 'Panificação', calorias100g: 300, proteina100g: 8.0, carboidrato100g: 58.6, gordura100g: 3.1, fibras100g: 2.3 },
  { id: 'taco-8', nome: 'Pão, de forma, tradicional', categoria: 'Panificação', calorias100g: 253, proteina100g: 9.4, carboidrato100g: 49.9, gordura100g: 3.7, fibras100g: 3.2 },
  { id: 'taco-9', nome: 'Pão, de forma, integral', categoria: 'Panificação', calorias100g: 253, proteina100g: 8.8, carboidrato100g: 49.9, gordura100g: 3.7, fibras100g: 6.9 },
  { id: 'taco-10', nome: 'Tapioca / Goma de mandioca', categoria: 'Derivados', calorias100g: 242, proteina100g: 0.0, carboidrato100g: 60.0, gordura100g: 0.0, fibras100g: 0.5 },
  { id: 'taco-11', nome: 'Cuscuz de milho, cozido', categoria: 'Cereais', calorias100g: 112, proteina100g: 2.2, carboidrato100g: 25.3, gordura100g: 0.7, fibras100g: 1.8 },
  { id: 'taco-12', nome: 'Milho, verde, cozido', categoria: 'Cereais', calorias100g: 138, proteina100g: 6.6, carboidrato100g: 28.6, gordura100g: 1.2, fibras100g: 3.9 },
  { id: 'taco-13', nome: 'Farinha, de mandioca, torrada', categoria: 'Farinhas', calorias100g: 361, proteina100g: 1.6, carboidrato100g: 87.9, gordura100g: 0.3, fibras100g: 6.5 },
  { id: 'taco-14', nome: 'Granola tradicional', categoria: 'Cereais', calorias100g: 421, proteina100g: 10.0, carboidrato100g: 70.0, gordura100g: 12.0, fibras100g: 6.0 },
  { id: 'taco-15', nome: 'Biscoito, água e sal', categoria: 'Panificação', calorias100g: 436, proteina100g: 10.1, carboidrato100g: 68.7, gordura100g: 14.4, fibras100g: 2.5 },

  // CARNES E AVES
  { id: 'taco-16', nome: 'Frango, peito, sem pele, cozido / grelhado', categoria: 'Aves', calorias100g: 163, proteina100g: 31.5, carboidrato100g: 0.0, gordura100g: 3.2 },
  { id: 'taco-17', nome: 'Frango, peito, sem pele, cru', categoria: 'Aves', calorias100g: 119, proteina100g: 21.5, carboidrato100g: 0.0, gordura100g: 3.0 },
  { id: 'taco-18', nome: 'Frango, sobrecoxa, sem pele, cozida', categoria: 'Aves', calorias100g: 167, proteina100g: 26.9, carboidrato100g: 0.0, gordura100g: 5.8 },
  { id: 'taco-19', nome: 'Frango, coxa, sem pele, cozida', categoria: 'Aves', calorias100g: 167, proteina100g: 26.9, carboidrato100g: 0.0, gordura100g: 5.8 },
  { id: 'taco-20', nome: 'Carne bovina, patinho, sem gordura, grelhado', categoria: 'Carnes Bovinas', calorias100g: 219, proteina100g: 35.9, carboidrato100g: 0.0, gordura100g: 7.3 },
  { id: 'taco-21', nome: 'Carne bovina, patinho, cru', categoria: 'Carnes Bovinas', calorias100g: 133, proteina100g: 21.7, carboidrato100g: 0.0, gordura100g: 4.5 },
  { id: 'taco-22', nome: 'Carne bovina, alcatra, sem gordura, grelhada', categoria: 'Carnes Bovinas', calorias100g: 241, proteina100g: 31.9, carboidrato100g: 0.0, gordura100g: 11.6 },
  { id: 'taco-23', nome: 'Carne bovina, filé mignon, sem gordura, grelhado', categoria: 'Carnes Bovinas', calorias100g: 220, proteina100g: 32.8, carboidrato100g: 0.0, gordura100g: 8.8 },
  { id: 'taco-24', nome: 'Carne bovina, maminha, grelhada', categoria: 'Carnes Bovinas', calorias100g: 153, proteina100g: 30.7, carboidrato100g: 0.0, gordura100g: 2.4 },
  { id: 'taco-25', nome: 'Carne bovina, contrafilé, grelhado', categoria: 'Carnes Bovinas', calorias100g: 278, proteina100g: 35.9, carboidrato100g: 0.0, gordura100g: 13.7 },
  { id: 'taco-26', nome: 'Carne bovina, moída (acém/patinho), refogada', categoria: 'Carnes Bovinas', calorias100g: 212, proteina100g: 26.7, carboidrato100g: 0.0, gordura100g: 10.9 },
  { id: 'taco-27', nome: 'Carne bovina, coxão mole, cozido', categoria: 'Carnes Bovinas', calorias100g: 219, proteina100g: 32.4, carboidrato100g: 0.0, gordura100g: 8.9 },
  { id: 'taco-28', nome: 'Carne suína, lombo, assado', categoria: 'Carnes Suínas', calorias100g: 210, proteina100g: 35.7, carboidrato100g: 0.0, gordura100g: 6.4 },
  { id: 'taco-29', nome: 'Peixe, tilápia, filé, grelhado', categoria: 'Pescados', calorias100g: 128, proteina100g: 26.0, carboidrato100g: 0.0, gordura100g: 2.7 },
  { id: 'taco-30', nome: 'Peixe, salmão, sem pele, grelhado', categoria: 'Pescados', calorias100g: 229, proteina100g: 23.9, carboidrato100g: 0.0, gordura100g: 14.0 },
  { id: 'taco-31', nome: 'Peixe, atum, conserva em óleo drenado', categoria: 'Pescados', calorias100g: 166, proteina100g: 26.2, carboidrato100g: 0.0, gordura100g: 6.0 },
  { id: 'taco-32', nome: 'Peixe, atum, sólido em água', categoria: 'Pescados', calorias100g: 116, proteina100g: 25.5, carboidrato100g: 0.0, gordura100g: 0.8 },
  { id: 'taco-33', nome: 'Camarão, cozido', categoria: 'Frutos do Mar', calorias100g: 90, proteina100g: 19.0, carboidrato100g: 0.0, gordura100g: 1.0 },

  // OVOS E LATICÍNIOS
  { id: 'taco-34', nome: 'Ovo, de galinha, inteiro, cozido', categoria: 'Ovos', calorias100g: 146, proteina100g: 13.3, carboidrato100g: 0.6, gordura100g: 9.5 },
  { id: 'taco-35', nome: 'Ovo, de galinha, clara, cozida', categoria: 'Ovos', calorias100g: 45, proteina100g: 10.9, carboidrato100g: 0.5, gordura100g: 0.1 },
  { id: 'taco-36', nome: 'Ovo, de galinha, gema, cozida', categoria: 'Ovos', calorias100g: 353, proteina100g: 15.9, carboidrato100g: 1.6, gordura100g: 30.8 },
  { id: 'taco-37', nome: 'Ovo, de galinha, frito', categoria: 'Ovos', calorias100g: 240, proteina100g: 15.6, carboidrato100g: 1.2, gordura100g: 18.6 },
  { id: 'taco-38', nome: 'Leite, de vaca, integral', categoria: 'Laticínios', calorias100g: 61, proteina100g: 3.2, carboidrato100g: 4.6, gordura100g: 3.3 },
  { id: 'taco-39', nome: 'Leite, de vaca, desnatado', categoria: 'Laticínios', calorias100g: 35, proteina100g: 3.5, carboidrato100g: 4.8, gordura100g: 0.2 },
  { id: 'taco-40', nome: 'Leite, de vaca, semidesnatado', categoria: 'Laticínios', calorias100g: 48, proteina100g: 3.3, carboidrato100g: 4.7, gordura100g: 1.8 },
  { id: 'taco-41', nome: 'Iogurte, natural, integral', categoria: 'Laticínios', calorias100g: 51, proteina100g: 4.1, carboidrato100g: 3.5, gordura100g: 3.0 },
  { id: 'taco-42', nome: 'Iogurte, natural, desnatado', categoria: 'Laticínios', calorias100g: 41, proteina100g: 3.8, carboidrato100g: 5.8, gordura100g: 0.3 },
  { id: 'taco-43', nome: 'Queijo, minas frescal', categoria: 'Laticínios', calorias100g: 264, proteina100g: 17.4, carboidrato100g: 3.2, gordura100g: 20.2 },
  { id: 'taco-44', nome: 'Queijo, ricota fresca', categoria: 'Laticínios', calorias100g: 140, proteina100g: 12.6, carboidrato100g: 3.8, gordura100g: 8.1 },
  { id: 'taco-45', nome: 'Queijo, cottage', categoria: 'Laticínios', calorias100g: 98, proteina100g: 11.1, carboidrato100g: 3.4, gordura100g: 4.3 },
  { id: 'taco-46', nome: 'Queijo, mussarela', categoria: 'Laticínios', calorias100g: 330, proteina100g: 24.0, carboidrato100g: 3.0, gordura100g: 25.0 },
  { id: 'taco-47', nome: 'Queijo, prato', categoria: 'Laticínios', calorias100g: 360, proteina100g: 22.7, carboidrato100g: 1.9, gordura100g: 29.1 },
  { id: 'taco-48', nome: 'Queijo, parmesão ralado', categoria: 'Laticínios', calorias100g: 453, proteina100g: 35.6, carboidrato100g: 1.7, gordura100g: 33.5 },
  { id: 'taco-49', nome: 'Requeijão cremoso', categoria: 'Laticínios', calorias100g: 257, proteina100g: 9.6, carboidrato100g: 2.4, gordura100g: 23.4 },
  { id: 'taco-50', nome: 'Whey Protein Concentrado (80%)', categoria: 'Suplementos', calorias100g: 400, proteina100g: 80.0, carboidrato100g: 6.0, gordura100g: 6.0 },
  { id: 'taco-51', nome: 'Whey Protein Isolado (90%)', categoria: 'Suplementos', calorias100g: 370, proteina100g: 90.0, carboidrato100g: 1.0, gordura100g: 0.5 },

  // LEGUMINOSAS E DERIVADOS
  { id: 'taco-52', nome: 'Feijão, carioca, cozido', categoria: 'Leguminosas', calorias100g: 76, proteina100g: 4.8, carboidrato100g: 13.6, gordura100g: 0.5, fibras100g: 8.5 },
  { id: 'taco-53', nome: 'Feijão, preto, cozido', categoria: 'Leguminosas', calorias100g: 77, proteina100g: 4.5, carboidrato100g: 14.0, gordura100g: 0.5, fibras100g: 8.4 },
  { id: 'taco-54', nome: 'Feijão, fradinho, cozido', categoria: 'Leguminosas', calorias100g: 78, proteina100g: 5.1, carboidrato100g: 13.0, gordura100g: 0.6, fibras100g: 6.5 },
  { id: 'taco-55', nome: 'Grão-de-bico, cozido', categoria: 'Leguminosas', calorias100g: 164, proteina100g: 8.9, carboidrato100g: 27.4, gordura100g: 2.6, fibras100g: 5.4 },
  { id: 'taco-56', nome: 'Lentilha, cozida', categoria: 'Leguminosas', calorias100g: 93, proteina100g: 6.3, carboidrato100g: 16.3, gordura100g: 0.5, fibras100g: 4.0 },
  { id: 'taco-57', nome: 'Ervilha, em conserva drenada', categoria: 'Leguminosas', calorias100g: 74, proteina100g: 4.6, carboidrato100g: 13.4, gordura100g: 0.4, fibras100g: 5.1 },
  { id: 'taco-58', nome: 'Soja, grão, cozida', categoria: 'Leguminosas', calorias100g: 173, proteina100g: 16.6, carboidrato100g: 9.9, gordura100g: 9.0, fibras100g: 6.0 },
  { id: 'taco-59', nome: 'Tofu (queijo de soja)', categoria: 'Derivados', calorias100g: 64, proteina100g: 6.6, carboidrato100g: 2.1, gordura100g: 4.0 },

  // TUBÉRCULOS, RAÍZES E HORTALIÇAS
  { id: 'taco-60', nome: 'Batata, inglesa, cozida', categoria: 'Tubérculos', calorias100g: 52, proteina100g: 1.2, carboidrato100g: 11.9, gordura100g: 0.0, fibras100g: 1.3 },
  { id: 'taco-61', nome: 'Batata, doce, cozida', categoria: 'Tubérculos', calorias100g: 77, proteina100g: 0.6, carboidrato100g: 18.4, gordura100g: 0.1, fibras100g: 2.2 },
  { id: 'taco-62', nome: 'Mandioca / Aipim, cozida', categoria: 'Tubérculos', calorias100g: 125, proteina100g: 0.6, carboidrato100g: 30.1, gordura100g: 0.3, fibras100g: 1.6 },
  { id: 'taco-63', nome: 'Mandioquinha / Batata-baroa, cozida', categoria: 'Tubérculos', calorias100g: 80, proteina100g: 0.9, carboidrato100g: 18.9, gordura100g: 0.2, fibras100g: 1.8 },
  { id: 'taco-64', nome: 'Cenoura, crua', categoria: 'Hortaliças', calorias100g: 34, proteina100g: 1.3, carboidrato100g: 7.7, gordura100g: 0.2, fibras100g: 3.2 },
  { id: 'taco-65', nome: 'Cenoura, cozida', categoria: 'Hortaliças', calorias100g: 30, proteina100g: 0.8, carboidrato100g: 6.7, gordura100g: 0.2, fibras100g: 2.6 },
  { id: 'taco-66', nome: 'Beterraba, cozida', categoria: 'Hortaliças', calorias100g: 32, proteina100g: 1.3, carboidrato100g: 7.2, gordura100g: 0.1, fibras100g: 1.9 },
  { id: 'taco-67', nome: 'Brócolis, cozido', categoria: 'Hortaliças', calorias100g: 25, proteina100g: 2.1, carboidrato100g: 4.4, gordura100g: 0.5, fibras100g: 3.4 },
  { id: 'taco-68', nome: 'Couve-flor, cozida', categoria: 'Hortaliças', calorias100g: 19, proteina100g: 1.2, carboidrato100g: 3.9, gordura100g: 0.2, fibras100g: 2.1 },
  { id: 'taco-69', nome: 'Espinafre, refogado', categoria: 'Hortaliças', calorias100g: 67, proteina100g: 2.7, carboidrato100g: 4.2, gordura100g: 5.4, fibras100g: 2.5 },
  { id: 'taco-70', nome: 'Alface, crespa, crua', categoria: 'Hortaliças', calorias100g: 11, proteina100g: 1.3, carboidrato100g: 1.7, gordura100g: 0.2, fibras100g: 1.8 },
  { id: 'taco-71', nome: 'Tomate, salada, cru', categoria: 'Hortaliças', calorias100g: 15, proteina100g: 1.1, carboidrato100g: 3.1, gordura100g: 0.2, fibras100g: 1.2 },
  { id: 'taco-72', nome: 'Abobrinha, italiana, cozida', categoria: 'Hortaliças', calorias100g: 15, proteina100g: 1.1, carboidrato100g: 3.0, gordura100g: 0.2, fibras100g: 1.6 },
  { id: 'taco-73', nome: 'Abóbora, cabotian / japonesa, cozida', categoria: 'Hortaliças', calorias100g: 48, proteina100g: 1.4, carboidrato100g: 10.8, gordura100g: 0.7, fibras100g: 2.5 },
  { id: 'taco-74', nome: 'Chuchu, cozido', categoria: 'Hortaliças', calorias100g: 19, proteina100g: 0.4, carboidrato100g: 4.8, gordura100g: 0.1, fibras100g: 1.0 },
  { id: 'taco-75', nome: 'Pepino, cru com casca', categoria: 'Hortaliças', calorias100g: 10, proteina100g: 0.9, carboidrato100g: 2.0, gordura100g: 0.1, fibras100g: 1.1 },
  { id: 'taco-76', nome: 'Cebola, crua', categoria: 'Hortaliças', calorias100g: 39, proteina100g: 1.7, carboidrato100g: 8.9, gordura100g: 0.1, fibras100g: 2.2 },

  // FRUTAS
  { id: 'taco-77', nome: 'Banana, prata, crua', categoria: 'Frutas', calorias100g: 98, proteina100g: 1.3, carboidrato100g: 26.0, gordura100g: 0.1, fibras100g: 2.0 },
  { id: 'taco-78', nome: 'Banana, nanica, crua', categoria: 'Frutas', calorias100g: 92, proteina100g: 1.4, carboidrato100g: 23.8, gordura100g: 0.1, fibras100g: 1.9 },
  { id: 'taco-79', nome: 'Maçã, fuji, com casca', categoria: 'Frutas', calorias100g: 56, proteina100g: 0.3, carboidrato100g: 15.2, gordura100g: 0.0, fibras100g: 1.3 },
  { id: 'taco-80', nome: 'Maçã, gala, com casca', categoria: 'Frutas', calorias100g: 55, proteina100g: 0.2, carboidrato100g: 14.8, gordura100g: 0.0, fibras100g: 1.4 },
  { id: 'taco-81', nome: 'Abacate, cru', categoria: 'Frutas', calorias100g: 96, proteina100g: 1.2, carboidrato100g: 6.0, gordura100g: 8.4, fibras100g: 6.3 },
  { id: 'taco-82', nome: 'Morango, cru', categoria: 'Frutas', calorias100g: 30, proteina100g: 0.9, carboidrato100g: 6.8, gordura100g: 0.3, fibras100g: 1.7 },
  { id: 'taco-83', nome: 'Laranja, pera, crua', categoria: 'Frutas', calorias100g: 37, proteina100g: 1.0, carboidrato100g: 8.9, gordura100g: 0.1, fibras100g: 1.8 },
  { id: 'taco-84', nome: 'Melancia, crua', categoria: 'Frutas', calorias100g: 33, proteina100g: 0.9, carboidrato100g: 8.1, gordura100g: 0.0, fibras100g: 0.1 },
  { id: 'taco-85', nome: 'Mamão, papaia, cru', categoria: 'Frutas', calorias100g: 40, proteina100g: 0.5, carboidrato100g: 10.4, gordura100g: 0.1, fibras100g: 1.8 },
  { id: 'taco-86', nome: 'Uva, itália, crua', categoria: 'Frutas', calorias100g: 53, proteina100g: 0.7, carboidrato100g: 13.6, gordura100g: 0.2, fibras100g: 0.9 },
  { id: 'taco-87', nome: 'Manga, palmer, crua', categoria: 'Frutas', calorias100g: 72, proteina100g: 0.4, carboidrato100g: 19.4, gordura100g: 0.2, fibras100g: 1.6 },
  { id: 'taco-88', nome: 'Abacaxi, cru', categoria: 'Frutas', calorias100g: 48, proteina100g: 0.9, carboidrato100g: 12.3, gordura100g: 0.1, fibras100g: 1.0 },
  { id: 'taco-89', nome: 'Limão, suco', categoria: 'Frutas', calorias100g: 25, proteina100g: 0.4, carboidrato100g: 8.0, gordura100g: 0.0, fibras100g: 0.4 },
  { id: 'taco-90', nome: 'Melão, cru', categoria: 'Frutas', calorias100g: 29, proteina100g: 0.7, carboidrato100g: 7.5, gordura100g: 0.0, fibras100g: 0.3 },

  // GORDURAS, ÓLEOS E OLEAGINOSAS
  { id: 'taco-91', nome: 'Azeite, de oliva, extravirgem', categoria: 'Óleos e Gorduras', calorias100g: 884, proteina100g: 0.0, carboidrato100g: 0.0, gordura100g: 100.0 },
  { id: 'taco-92', nome: 'Manteiga, com sal', categoria: 'Óleos e Gorduras', calorias100g: 726, proteina100g: 0.6, carboidrato100g: 0.1, gordura100g: 82.4 },
  { id: 'taco-93', nome: 'Óleo, de soja', categoria: 'Óleos e Gorduras', calorias100g: 884, proteina100g: 0.0, carboidrato100g: 0.0, gordura100g: 100.0 },
  { id: 'taco-94', nome: 'Pasta de amendoim, integral', categoria: 'Oleaginosas', calorias100g: 588, proteina100g: 25.0, carboidrato100g: 20.0, gordura100g: 50.0, fibras100g: 6.0 },
  { id: 'taco-95', nome: 'Amendoim, torrado', categoria: 'Oleaginosas', calorias100g: 544, proteina100g: 22.5, carboidrato100g: 20.3, gordura100g: 43.9, fibras100g: 8.0 },
  { id: 'taco-96', nome: 'Castanha-do-brasil / do-pará', categoria: 'Oleaginosas', calorias100g: 643, proteina100g: 14.5, carboidrato100g: 15.1, gordura100g: 63.5, fibras100g: 7.9 },
  { id: 'taco-97', nome: 'Castanha-de-caju, torrada', categoria: 'Oleaginosas', calorias100g: 570, proteina100g: 18.5, carboidrato100g: 29.1, gordura100g: 46.3, fibras100g: 3.7 },
  { id: 'taco-98', nome: 'Nozes, cruas', categoria: 'Oleaginosas', calorias100g: 620, proteina100g: 14.0, carboidrato100g: 18.4, gordura100g: 59.4, fibras100g: 7.2 },
  { id: 'taco-99', nome: 'Semente, de chia', categoria: 'Sementes', calorias100g: 486, proteina100g: 16.5, carboidrato100g: 42.1, gordura100g: 30.7, fibras100g: 34.4 },
  { id: 'taco-100', nome: 'Mel, de abelha', categoria: 'Açúcares', calorias100g: 309, proteina100g: 0.0, carboidrato100g: 84.0, gordura100g: 0.0 },
];

/**
 * Searches the TACO database with normalization (accents-insensitive and case-insensitive).
 */
export function searchTacoFoods(query: string, maxResults = 10): TacoFoodItem[] {
  if (!query || query.trim().length === 0) return [];
  const cleanQ = normalizeString(query.trim());
  const terms = cleanQ.split(/\s+/).filter(Boolean);

  const matched = TACO_DATABASE.filter((item) => {
    const itemNorm = normalizeString(`${item.nome} ${item.categoria}`);
    return terms.every((term) => itemNorm.includes(term));
  });

  return matched.slice(0, maxResults);
}

/**
 * Calculates nutritional values for a given gram weight based on a 100g TACO food item.
 */
export function calculateNutrientsForWeight(food: TacoFoodItem, grams: number) {
  const safeGrams = Math.max(0, grams || 0);
  const factor = safeGrams / 100;

  return {
    calorias: Math.round(food.calorias100g * factor),
    proteinaG: Math.round((food.proteina100g * factor) * 10) / 10,
    carboidratoG: Math.round((food.carboidrato100g * factor) * 10) / 10,
    gorduraG: Math.round((food.gordura100g * factor) * 10) / 10,
    fibrasG: Math.round(((food.fibras100g || 0) * factor) * 10) / 10,
  };
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
