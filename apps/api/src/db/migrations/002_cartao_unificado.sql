-- Crédito e débito passam a ser uma única forma de pagamento: "Cartão".
UPDATE orders SET payment_method = 'CARTAO' WHERE payment_method IN ('CREDITO', 'DEBITO');
