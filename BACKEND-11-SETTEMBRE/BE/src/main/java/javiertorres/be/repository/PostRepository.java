package javiertorres.be.repository;
import javiertorres.be.model.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface PostRepository extends JpaRepository<Post, UUID> {}
