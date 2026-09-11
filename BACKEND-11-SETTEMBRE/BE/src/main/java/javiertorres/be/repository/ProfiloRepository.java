package javiertorres.be.repository;
import javiertorres.be.model.Profilo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface ProfiloRepository extends JpaRepository<Profilo, UUID> {}
