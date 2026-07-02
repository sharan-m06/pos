package com.retailflow.pos.expense;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ExpenseRepository extends JpaRepository<Expense,String>{List<Expense> findByExpenseDateBetween(LocalDate from,LocalDate to);}
