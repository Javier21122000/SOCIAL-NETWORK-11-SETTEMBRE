package javiertorres.be.service;
import javiertorres.be.model.Utente;
import javiertorres.be.repository.UtenteRepository;
import org.springframework.stereotype.Service;
import java.util.*;
@Service
public class UtenteService {
    private final UtenteRepository repository;
    public UtenteService(UtenteRepository repository) { this.repository = repository; }
    public List<Utente> findAll() { return repository.findAll(); }
    public Optional<Utente> findById(UUID id) { return repository.findById(id); }
    public Utente save(Utente utente) { return repository.save(utente); }
    public void delete(UUID id) { repository.deleteById(id); }
}
