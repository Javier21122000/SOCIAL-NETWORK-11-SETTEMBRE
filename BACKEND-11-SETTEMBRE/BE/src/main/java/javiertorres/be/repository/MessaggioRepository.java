package javiertorres.be.repository;
import javiertorres.be.model.Messaggio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface MessaggioRepository extends JpaRepository<Messaggio, UUID> {}
