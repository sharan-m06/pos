package com.retailflow.pos.stock;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
public interface StockMovementRepository extends JpaRepository<StockMovement,String>{List<StockMovement> findByProductId(String id);List<StockMovement> findAllByOrderByCreatedAtDesc(Pageable page);}
