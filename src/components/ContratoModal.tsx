import React from 'react'
import type { VendaRecord } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, X, Building2, ShieldCheck, FileText } from 'lucide-react'

interface ContratoModalProps {
  venda: VendaRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContratoModal({ venda, open, onOpenChange }: ContratoModalProps) {
  if (!venda) return null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR')
  }

  const valorMensalUnitario = venda.expand?.produto?.valor_locacao_mensal || 0
  const valorTotalMensalItens = valorMensalUnitario * (venda.quantidade || 1)

  const handlePrint = () => {
    window.print()
  }

  const dataEmissao = venda.created ? formatDate(venda.created) : formatDate(venda.data_inicio)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 bg-white border-[#E5E0DA] print:max-h-none print:overflow-visible print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Barra superior com ações - oculta na impressão */}
        <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E0DA] bg-[#FAF7F3] px-6 py-3.5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#A67C52]" />
            <div>
              <h3 className="font-bold text-sm text-[#2B2B2B]">
                Visualização do Contrato de Locação
              </h3>
              <p className="text-[11px] text-[#6B6B6B]">Venda / Contrato nº #{venda.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="bg-[#A67C52] hover:bg-[#8C643F] text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-[#E5E0DA] text-xs"
            >
              Fechar
            </Button>
          </div>
        </div>

        {/* Documento Imprimível */}
        <div className="contrato-print-area p-8 sm:p-12 text-[#2B2B2B] bg-white space-y-6">
          {/* Cabeçalho do Contrato */}
          <div className="border-b-2 border-[#A67C52] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#A67C52] text-white font-extrabold text-xl tracking-wider">
                LP
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#2B2B2B] tracking-tight">
                  LP MÓVEIS
                </h1>
                <p className="text-xs uppercase tracking-widest font-bold text-[#A67C52]">
                  Contrato de Locação de Móveis
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right text-xs text-[#6B6B6B]">
              <div className="font-bold text-[#2B2B2B] text-sm">
                Contrato nº <span className="font-mono text-[#A67C52]">#{venda.id}</span>
              </div>
              <div>
                Data de Emissão: <strong>{dataEmissao}</strong>
              </div>
              <div>
                Status:{' '}
                <span className="font-semibold uppercase text-emerald-700">{venda.status}</span>
              </div>
            </div>
          </div>

          {/* Qualificação das Partes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Locadora */}
            <div className="rounded-lg border border-[#E5E0DA] bg-[#FAF7F3] p-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#A67C52] mb-2 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                <span>Locadora (Prestadora)</span>
              </h4>
              <p className="font-semibold text-sm text-[#2B2B2B]">LP MÓVEIS LTDA.</p>
              <p className="text-[#6B6B6B] mt-0.5">
                Especialista em Gestão e Locação de Mobiliário de Alto Padrão
              </p>
              <p className="text-[#6B6B6B] mt-1">
                Vendedor Responsável:{' '}
                <strong>
                  {venda.expand?.vendedor?.name ||
                    venda.expand?.vendedor?.email ||
                    'Equipe LP Móveis'}
                </strong>
              </p>
              <p className="text-[#6B6B6B]">Contato: atendimento@lpmoveis.com.br</p>
            </div>

            {/* Locatário */}
            <div className="rounded-lg border border-[#E5E0DA] bg-[#FAF7F3] p-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#A67C52] mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Locatário(a) (Cliente)</span>
              </h4>
              <p className="font-semibold text-sm text-[#2B2B2B]">
                {venda.expand?.cliente?.nome || 'Cliente não identificado'}
              </p>
              <p className="text-[#6B6B6B] mt-0.5">
                E-mail: <strong>{venda.expand?.cliente?.email || '-'}</strong>
              </p>
              <p className="text-[#6B6B6B]">
                Telefone: <strong>{venda.expand?.cliente?.telefone || 'Não informado'}</strong>
              </p>
              <p className="text-[#6B6B6B] mt-1">
                Endereço de Instalação:{' '}
                <strong>{venda.expand?.cliente?.endereco || 'Endereço cadastrado'}</strong>
              </p>
            </div>
          </div>

          {/* Tabela de Itens Locados */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2B2B2B]">
              Objeto da Locação (Móveis)
            </h4>
            <table className="w-full text-left text-xs border border-[#E5E0DA] rounded-lg overflow-hidden">
              <thead className="bg-[#FAF7F3] font-bold text-[#6B6B6B] uppercase border-b border-[#E5E0DA]">
                <tr>
                  <th className="px-3 py-2.5">Código</th>
                  <th className="px-3 py-2.5">Descrição do Produto</th>
                  <th className="px-3 py-2.5">Linha</th>
                  <th className="px-3 py-2.5 text-center">Qtd</th>
                  <th className="px-3 py-2.5 text-right">Valor Mensal Unit.</th>
                  <th className="px-3 py-2.5 text-right">Subtotal Mensal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0DA]">
                <tr>
                  <td className="px-3 py-3 font-mono font-bold text-[#A67C52] text-xs align-top">
                    {venda.expand?.produto?.codigo || '-'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-bold text-sm text-[#2B2B2B]">
                      {venda.expand?.produto?.nome || 'Móvel TIDELLI'}
                    </div>
                    {venda.expand?.produto?.dimensoes && (
                      <div className="text-[11px] text-[#6B6B6B]">
                        Dimensões: {venda.expand.produto.dimensoes}
                      </div>
                    )}
                    {venda.expand?.produto?.descricao && (
                      <div className="text-[11px] text-[#6B6B6B] mt-0.5 max-w-md">
                        {venda.expand.produto.descricao}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-medium text-[#A67C52] align-top">
                    {venda.expand?.produto?.expand?.linha?.nome
                      ? `Linha ${venda.expand.produto.expand.linha.nome}`
                      : venda.expand?.produto?.linha
                        ? `Linha ${venda.expand.produto.linha}`
                        : 'Padrão TIDELLI'}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold align-top">
                    {venda.quantidade} un.
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    {formatCurrency(valorMensalUnitario)}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#A67C52] align-top">
                    {formatCurrency(valorTotalMensalItens)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Condições Financeiras e Vigência */}
          <div className="rounded-lg border border-[#E5E0DA] bg-[#FAF7F3] p-4 text-xs space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-[#2B2B2B]">
              Condições Comerciais e Vigência do Contrato
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <span className="text-[#6B6B6B] block">Período de Vigência:</span>
                <span className="font-bold text-[#2B2B2B] text-sm">
                  {formatDate(venda.data_inicio)} até {formatDate(venda.data_fim)}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block">Forma de Pagamento Mensal:</span>
                <span className="font-bold text-[#2B2B2B] text-sm capitalize">
                  {venda.forma_pagamento ? venda.forma_pagamento.replace(/_/g, ' ') : 'Boleto'}
                </span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block">Valor Total do Período Contratado:</span>
                <span className="font-extrabold text-[#A67C52] text-base">
                  {formatCurrency(venda.valor_total)}
                </span>
              </div>
            </div>

            {venda.observacoes && (
              <div className="pt-2 border-t border-[#E5E0DA] mt-2">
                <span className="font-semibold text-[#2B2B2B]">Observações Gerais:</span>{' '}
                <span className="text-[#6B6B6B]">{venda.observacoes}</span>
              </div>
            )}
          </div>

          {/* Cláusulas Padrão de Locação */}
          <div className="space-y-2 text-[11px] leading-relaxed text-[#555] border-t border-[#E5E0DA] pt-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#2B2B2B]">
              Cláusulas Gerais de Locação de Mobiliário
            </h4>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                <strong>Objeto e Destinação:</strong> A LOCADORA disponibiliza ao LOCATÁRIO, em
                regime de locação temporária, os bens descritos neste instrumento, destinados
                exclusivamente ao uso no endereço informado.
              </li>
              <li>
                <strong>Conservação e Uso:</strong> O LOCATÁRIO se compromete a zelar pelos móveis
                locados, mantendo-os em condições idênticas às de sua entrega, respondendo por
                quaisquer danos, avarias extraordinárias ou extravio decorrentes de dolo ou culpa.
              </li>
              <li>
                <strong>Pagamento Mensal:</strong> O LOCATÁRIO obriga-se ao pagamento pontual das
                mensalidades conforme a forma e vencimento ajustados. O atraso acarretará multa
                moratória e juros legais vigentes.
              </li>
              <li>
                <strong>Devolução e Vistoria:</strong> Ao término da vigência deste contrato, ou em
                caso de rescisão antecipada, os móveis deverão ser restituídos à LOCADORA mediante
                vistoria técnica conjunta de liberação.
              </li>
              <li>
                <strong>Foro:</strong> As partes elegem o foro da Comarca da Capital do Estado para
                dirimir quaisquer controvérsias oriundas deste instrumento.
              </li>
            </ol>
          </div>

          {/* Assinaturas */}
          <div className="pt-10 pb-4">
            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1">
                <div className="border-t border-[#2B2B2B] pt-2 font-bold text-[#2B2B2B]">
                  LP MÓVEIS LTDA.
                </div>
                <div className="text-[10px] text-[#6B6B6B]">
                  {venda.expand?.vendedor?.name || 'Representante Legal / Vendedor Responsável'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="border-t border-[#2B2B2B] pt-2 font-bold text-[#2B2B2B]">
                  {venda.expand?.cliente?.nome || 'LOCATÁRIO(A)'}
                </div>
                <div className="text-[10px] text-[#6B6B6B]">Assinatura do Cliente</div>
              </div>
            </div>
          </div>

          {/* Rodapé Obrigatório com Nota Discreta TIDELLI */}
          <div className="border-t border-[#E5E0DA] pt-3 text-center text-[10px] text-[#8C8C8C] space-y-0.5">
            <p>
              LP MÓVEIS — Gestão de Aluguel de Móveis de Alto Padrão. Documento gerado
              eletronicamente em {new Date().toLocaleDateString('pt-BR')}.
            </p>
            <p className="italic">
              * Nota: Produtos fabricados pela TIDELLI (a LP MÓVEIS atua na locação dos móveis de
              sua propriedade; inexistência de vínculo institucional ou responsabilidade solidária
              da fabricante neste contrato).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
