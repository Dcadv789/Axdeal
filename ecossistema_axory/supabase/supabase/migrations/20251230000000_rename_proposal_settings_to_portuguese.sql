/*
  # Renomear colunas da tabela proposal_settings para português do Brasil
  
  Esta migration renomeia as colunas da tabela proposal_settings de inglês para português do Brasil.
  As colunas de sistema (id, id_empresa, criado_em, atualizado_em) permanecem inalteradas.
  
  IMPORTANTE: Esta migration assume que a tabela proposal_settings já existe.
  Se a tabela não existir, você precisará criá-la primeiro.
*/

DO $$
BEGIN
  -- Renomear colunas comuns (apenas se existirem)
  
  -- Introdução
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'introduction') THEN
    ALTER TABLE proposal_settings RENAME COLUMN introduction TO introducao;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'introduction_text') THEN
    ALTER TABLE proposal_settings RENAME COLUMN introduction_text TO introducao_texto;
  END IF;
  
  -- Rodapé
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'footer') THEN
    ALTER TABLE proposal_settings RENAME COLUMN footer TO rodape;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'footer_text') THEN
    ALTER TABLE proposal_settings RENAME COLUMN footer_text TO rodape_texto;
  END IF;
  
  -- Observações
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'default_observations') THEN
    ALTER TABLE proposal_settings RENAME COLUMN default_observations TO observacoes_padrao;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'default_internal_observations') THEN
    ALTER TABLE proposal_settings RENAME COLUMN default_internal_observations TO observacoes_internas_padrao;
  END IF;
  
  -- Campos booleanos de exibição
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_total_value') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_total_value TO mostrar_valor_total;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_discount') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_discount TO mostrar_desconto;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_addition') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_addition TO mostrar_acrescimo;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_freight') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_freight TO mostrar_frete;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'display_taxes') THEN
    ALTER TABLE proposal_settings RENAME COLUMN display_taxes TO exibir_impostos;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'include_warranty') THEN
    ALTER TABLE proposal_settings RENAME COLUMN include_warranty TO incluir_garantia;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'include_delivery_term') THEN
    ALTER TABLE proposal_settings RENAME COLUMN include_delivery_term TO incluir_prazo_entrega;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'include_payment_conditions') THEN
    ALTER TABLE proposal_settings RENAME COLUMN include_payment_conditions TO incluir_condicoes_pagamento;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'show_observations') THEN
    ALTER TABLE proposal_settings RENAME COLUMN show_observations TO mostrar_observacoes;
  END IF;
  
  -- Campos de exibição de itens
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'display_item_code') THEN
    ALTER TABLE proposal_settings RENAME COLUMN display_item_code TO exibir_codigo_item;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'display_quantity') THEN
    ALTER TABLE proposal_settings RENAME COLUMN display_quantity TO exibir_quantidade;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'display_unit_value') THEN
    ALTER TABLE proposal_settings RENAME COLUMN display_unit_value TO exibir_valor_unitario;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'display_subtotal') THEN
    ALTER TABLE proposal_settings RENAME COLUMN display_subtotal TO exibir_subtotal;
  END IF;
  
  -- Formatação
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'date_format') THEN
    ALTER TABLE proposal_settings RENAME COLUMN date_format TO formato_data;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'currency_format') THEN
    ALTER TABLE proposal_settings RENAME COLUMN currency_format TO formato_moeda;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'currency_symbol') THEN
    ALTER TABLE proposal_settings RENAME COLUMN currency_symbol TO simbolo_moeda;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'decimal_separator') THEN
    ALTER TABLE proposal_settings RENAME COLUMN decimal_separator TO separador_decimal;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'thousands_separator') THEN
    ALTER TABLE proposal_settings RENAME COLUMN thousands_separator TO separador_milhar;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'decimal_places') THEN
    ALTER TABLE proposal_settings RENAME COLUMN decimal_places TO casas_decimais;
  END IF;
  
  -- Layout e personalização
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'proposal_layout') THEN
    ALTER TABLE proposal_settings RENAME COLUMN proposal_layout TO layout_proposta;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'color_theme') THEN
    ALTER TABLE proposal_settings RENAME COLUMN color_theme TO tema_cor;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'company_logo') THEN
    ALTER TABLE proposal_settings RENAME COLUMN company_logo TO logo_empresa;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'custom_header') THEN
    ALTER TABLE proposal_settings RENAME COLUMN custom_header TO cabecalho_personalizado;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'custom_footer') THEN
    ALTER TABLE proposal_settings RENAME COLUMN custom_footer TO rodape_personalizado;
  END IF;
  
  -- Funcionalidades
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'digital_signature') THEN
    ALTER TABLE proposal_settings RENAME COLUMN digital_signature TO assinatura_digital;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'qrcode') THEN
    ALTER TABLE proposal_settings RENAME COLUMN qrcode TO qrcode;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'barcode') THEN
    ALTER TABLE proposal_settings RENAME COLUMN barcode TO codigo_barras;
  END IF;
  
  -- Prazos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'validity_days') THEN
    ALTER TABLE proposal_settings RENAME COLUMN validity_days TO validade_dias;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'response_deadline_days') THEN
    ALTER TABLE proposal_settings RENAME COLUMN response_deadline_days TO prazo_resposta_dias;
  END IF;
  
  -- Automações
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'send_automatic_email') THEN
    ALTER TABLE proposal_settings RENAME COLUMN send_automatic_email TO enviar_email_automatico;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'send_whatsapp') THEN
    ALTER TABLE proposal_settings RENAME COLUMN send_whatsapp TO enviar_whatsapp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'email_template') THEN
    ALTER TABLE proposal_settings RENAME COLUMN email_template TO template_email;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'whatsapp_template') THEN
    ALTER TABLE proposal_settings RENAME COLUMN whatsapp_template TO template_whatsapp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'required_signature') THEN
    ALTER TABLE proposal_settings RENAME COLUMN required_signature TO assinatura_obrigatoria;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'auto_approve') THEN
    ALTER TABLE proposal_settings RENAME COLUMN auto_approve TO aprovar_automaticamente;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'auto_generate_sale') THEN
    ALTER TABLE proposal_settings RENAME COLUMN auto_generate_sale TO gerar_venda_automatica;
  END IF;
  
  -- Status e permissões
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'initial_status') THEN
    ALTER TABLE proposal_settings RENAME COLUMN initial_status TO status_inicial;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'allow_editing') THEN
    ALTER TABLE proposal_settings RENAME COLUMN allow_editing TO permitir_edicao;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'allow_deletion') THEN
    ALTER TABLE proposal_settings RENAME COLUMN allow_deletion TO permitir_exclusao;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'change_history') THEN
    ALTER TABLE proposal_settings RENAME COLUMN change_history TO historico_alteracoes;
  END IF;
  
  -- Notificações
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'notifications') THEN
    ALTER TABLE proposal_settings RENAME COLUMN notifications TO notificacoes;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'alerts') THEN
    ALTER TABLE proposal_settings RENAME COLUMN alerts TO alertas;
  END IF;
  
  -- Integrações
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'crm_integration') THEN
    ALTER TABLE proposal_settings RENAME COLUMN crm_integration TO integracao_crm;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'erp_integration') THEN
    ALTER TABLE proposal_settings RENAME COLUMN erp_integration TO integracao_erp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'api_key') THEN
    ALTER TABLE proposal_settings RENAME COLUMN api_key TO api_key;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'webhook_url') THEN
    ALTER TABLE proposal_settings RENAME COLUMN webhook_url TO webhook_url;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proposal_settings' AND column_name = 'auto_sync') THEN
    ALTER TABLE proposal_settings RENAME COLUMN auto_sync TO sincronizacao_automatica;
  END IF;
  
END $$;





