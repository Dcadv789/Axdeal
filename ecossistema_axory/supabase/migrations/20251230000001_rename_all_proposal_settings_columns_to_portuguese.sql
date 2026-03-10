/*
  # Renomear TODAS as colunas da tabela proposal_settings para português do Brasil
  
  Esta migration renomeia todas as colunas restantes em inglês para português do Brasil.
  Baseado na estrutura atual da tabela após a primeira migration.
*/

DO $$
BEGIN
  -- Introdução e termos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'default_introduction') THEN
    ALTER TABLE proposal_settings RENAME COLUMN default_introduction TO introducao_padrao;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'default_terms_conditions') THEN
    ALTER TABLE proposal_settings RENAME COLUMN default_terms_conditions TO termos_condicoes_padrao;
  END IF;
  
  -- Campos de exibição (show_*)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_client_info') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_client_info TO mostrar_info_cliente;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_company_info') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_company_info TO mostrar_info_empresa;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_items_table') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_items_table TO mostrar_tabela_itens;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_totals') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_totals TO mostrar_totais;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_payment_conditions') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_payment_conditions TO mostrar_condicoes_pagamento;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_delivery_terms') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_delivery_terms TO mostrar_prazos_entrega;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_warranties') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_warranties TO mostrar_garantias;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_notes') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_notes TO mostrar_observacoes;
  END IF;
  
  -- Cores
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'primary_color') THEN
    ALTER TABLE proposal_settings RENAME COLUMN primary_color TO cor_primaria;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'secondary_color') THEN
    ALTER TABLE proposal_settings RENAME COLUMN secondary_color TO cor_secundaria;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'header_background_color') THEN
    ALTER TABLE proposal_settings RENAME COLUMN header_background_color TO cor_fundo_cabecalho;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'header_text_color') THEN
    ALTER TABLE proposal_settings RENAME COLUMN header_text_color TO cor_texto_cabecalho;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'header_info_background_color') THEN
    ALTER TABLE proposal_settings RENAME COLUMN header_info_background_color TO cor_fundo_info_cabecalho;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'footer_background_color') THEN
    ALTER TABLE proposal_settings RENAME COLUMN footer_background_color TO cor_fundo_rodape;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'footer_text_color') THEN
    ALTER TABLE proposal_settings RENAME COLUMN footer_text_color TO cor_texto_rodape;
  END IF;
  
  -- Layout e estilo
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'logo_position') THEN
    ALTER TABLE proposal_settings RENAME COLUMN logo_position TO posicao_logo;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'font_family') THEN
    ALTER TABLE proposal_settings RENAME COLUMN font_family TO familia_fonte;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'font_size') THEN
    ALTER TABLE proposal_settings RENAME COLUMN font_size TO tamanho_fonte;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'item_table_style') THEN
    ALTER TABLE proposal_settings RENAME COLUMN item_table_style TO estilo_tabela_itens;
  END IF;
  
  -- Formatação de moeda e números
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'currency_position') THEN
    ALTER TABLE proposal_settings RENAME COLUMN currency_position TO posicao_moeda;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'number_format') THEN
    ALTER TABLE proposal_settings RENAME COLUMN number_format TO formato_numero;
  END IF;
  
  -- Campos de exibição específicos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_currency_code') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_currency_code TO mostrar_codigo_moeda;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_proposal_code') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_proposal_code TO mostrar_codigo_proposta;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_issue_date') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_issue_date TO mostrar_data_emissao;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_validity_date') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_validity_date TO mostrar_data_validade;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_seller_info') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_seller_info TO mostrar_info_vendedor;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_client_address') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_client_address TO mostrar_endereco_cliente;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_client_contact') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_client_contact TO mostrar_contato_cliente;
  END IF;
  
  -- Campos de itens
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_item_code') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_item_code TO mostrar_codigo_item;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_item_description') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_item_description TO mostrar_descricao_item;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_item_quantity') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_item_quantity TO mostrar_quantidade_item;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_item_unit_price') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_item_unit_price TO mostrar_preco_unitario_item;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_item_total') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_item_total TO mostrar_total_item;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_item_discount') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_item_discount TO mostrar_desconto_item;
  END IF;
  
  -- Totais e valores
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_subtotal') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_subtotal TO mostrar_subtotal;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_shipping') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_shipping TO mostrar_frete;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_taxes') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_taxes TO mostrar_impostos;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_total') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_total TO mostrar_total;
  END IF;
  
  -- Rodapé
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_footer') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_footer TO mostrar_rodape;
  END IF;
  
  -- Timestamps (se ainda estiverem em inglês)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'created_at') THEN
    ALTER TABLE proposal_settings RENAME COLUMN created_at TO criado_em;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'updated_at') THEN
    ALTER TABLE proposal_settings RENAME COLUMN updated_at TO atualizado_em;
  END IF;
  
END $$;





